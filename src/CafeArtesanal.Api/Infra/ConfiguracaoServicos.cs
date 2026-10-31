using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using CafeArtesanal.Application.Comum;
using CafeArtesanal.Infrastructure.Seguranca;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace CafeArtesanal.Api.Infra;

/// <summary>Registro dos serviços próprios da camada de apresentação (API REST).</summary>
public static class ConfiguracaoServicos
{
    public static IServiceCollection AddApi(this IServiceCollection services, IConfiguration config, IWebHostEnvironment ambiente)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<IUsuarioAtual, UsuarioAtualHttp>();
        services.Configure<LojaOptions>(config.GetSection(LojaOptions.Secao));

        services.AddControllers()
            .AddJsonOptions(o =>
            {
                o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
                // Enums trafegam como "em_preparo", "cartao_credito"... (mesmo código do banco)
                o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower, allowIntegerValues: false));
            })
            .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = RespostaValidacao);

        services.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
            c.ProblemDetails.Extensions["traceId"] = c.HttpContext.TraceIdentifier);
        services.AddExceptionHandler<TratadorDeExcecoes>();

        services.AddAutenticacaoJwt(config);
        services.AddLimitesDeRequisicao(config);
        services.AddDocumentacaoSwagger();

        services.AddCors(o => o.AddDefaultPolicy(politica =>
        {
            var origens = config.GetSection("Cors:Origens").Get<string[]>() ?? [];
            if (origens.Length > 0) politica.WithOrigins(origens);
            else if (ambiente.IsDevelopment()) politica.AllowAnyOrigin(); // Expo Web / testes locais
            politica.AllowAnyHeader().AllowAnyMethod();
        }));

        services.AddResponseCompression(o => o.EnableForHttps = true);
        services.AddHealthChecks().AddCheck<VerificacaoBanco>("banco-de-dados");

        return services;
    }

    private static void AddAutenticacaoJwt(this IServiceCollection services, IConfiguration config)
    {
        var jwt = config.GetSection(JwtOptions.Secao).Get<JwtOptions>() ?? new JwtOptions();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.MapInboundClaims = false;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Emissor,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audiencia,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Chave)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = ClaimsCafe.Nome,
                    RoleClaimType = ClaimsCafe.Perfil
                };
                o.Events = new JwtBearerEvents
                {
                    OnChallenge = async contexto =>
                    {
                        contexto.HandleResponse();
                        var expirou = contexto.AuthenticateFailure is SecurityTokenExpiredException;
                        await EscreverProblema(contexto.HttpContext, StatusCodes.Status401Unauthorized, "Não autenticado",
                            expirou ? "Sua sessão expirou." : "Faça login para continuar.");
                    },
                    OnForbidden = contexto => EscreverProblema(contexto.HttpContext, StatusCodes.Status403Forbidden,
                        "Acesso negado", "Seu perfil não tem permissão para esta ação.")
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(Politicas.Equipe, p => p.RequireRole("atendente", "admin"))
            .AddPolicy(Politicas.Admin, p => p.RequireRole("admin"));
    }

    private static void AddLimitesDeRequisicao(this IServiceCollection services, IConfiguration config)
    {
        var loginsPorMinuto = config.GetValue("Seguranca:LoginsPorMinuto", 10);
        var requisicoesPorMinuto = config.GetValue("Seguranca:RequisicoesPorMinuto", 600);

        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Limite geral por IP (protege contra abuso/DoS simples).
            o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                RateLimitPartition.GetFixedWindowLimiter(Ip(ctx), _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = requisicoesPorMinuto,
                    Window = TimeSpan.FromMinutes(1)
                }));

            // Limite rígido para login/cadastro (anti força bruta).
            o.AddPolicy(Politicas.LimiteAutenticacao, ctx =>
                RateLimitPartition.GetFixedWindowLimiter(Ip(ctx), _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = loginsPorMinuto,
                    Window = TimeSpan.FromMinutes(1)
                }));

            o.OnRejected = (contexto, _) => new ValueTask(EscreverProblema(contexto.HttpContext,
                StatusCodes.Status429TooManyRequests, "Muitas requisições",
                "Você fez muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente."));
        });

        static string Ip(HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
    }

    private static void AddDocumentacaoSwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Café Artesanal API",
                Version = "v1",
                Description = "API REST da solução Café Artesanal (Web + App Mobile). " +
                              "Autentique em POST /api/v1/auth/login e use o botão Authorize com o accessToken."
            });

            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "Cole apenas o accessToken (sem a palavra Bearer).",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT"
            });
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = []
            });

            foreach (var assembly in new[] { Assembly.GetExecutingAssembly(), typeof(LojaOptions).Assembly })
            {
                var xml = Path.Combine(AppContext.BaseDirectory, $"{assembly.GetName().Name}.xml");
                if (File.Exists(xml)) c.IncludeXmlComments(xml);
            }
        });
    }

    /// <summary>Resposta 400 padronizada para erros de validação dos DTOs.</summary>
    private static IActionResult RespostaValidacao(ActionContext contexto)
    {
        var problema = new ValidationProblemDetails(contexto.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Dados inválidos",
            Detail = contexto.ModelState.Values.SelectMany(v => v.Errors)
                         .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Formato de dado inválido." : e.ErrorMessage)
                         .FirstOrDefault() ?? "Verifique os dados enviados."
        };
        problema.Extensions["traceId"] = contexto.HttpContext.TraceIdentifier;
        return new BadRequestObjectResult(problema) { ContentTypes = { "application/problem+json" } };
    }

    private static Task EscreverProblema(HttpContext contexto, int status, string titulo, string detalhe)
    {
        contexto.Response.StatusCode = status;
        return contexto.RequestServices.GetRequiredService<IProblemDetailsService>().WriteAsync(new ProblemDetailsContext
        {
            HttpContext = contexto,
            ProblemDetails = new ProblemDetails { Status = status, Title = titulo, Detail = detalhe }
        }).AsTask();
    }
}
