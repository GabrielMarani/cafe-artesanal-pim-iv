using System.ComponentModel.DataAnnotations;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Application.Validacao;

/// <summary>Valida os dígitos verificadores do CPF.</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class CpfAttribute : ValidationAttribute
{
    public CpfAttribute() : base("CPF inválido.") { }

    public override bool IsValid(object? value) =>
        value is null || (value is string texto && Cpf.EhValido(texto));
}

/// <summary>Senha com no mínimo 8 caracteres, contendo letras e números.</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class SenhaForteAttribute : ValidationAttribute
{
    public const int TamanhoMinimo = 8;

    public SenhaForteAttribute()
        : base($"A senha deve ter no mínimo {TamanhoMinimo} caracteres, com letras e números.") { }

    public override bool IsValid(object? value) =>
        value is string senha &&
        senha.Length is >= TamanhoMinimo and <= 100 &&
        senha.Any(char.IsLetter) &&
        senha.Any(char.IsDigit);
}

/// <summary>Valida se o texto é um código de enum aceito (ex.: "em_preparo").</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class CodigoEnumAttribute<T> : ValidationAttribute where T : struct, Enum
{
    public override bool IsValid(object? value) =>
        value is null || (value is string texto && CodigoEnum.TentarConverter<T>(texto, out _));

    public override string FormatErrorMessage(string name) =>
        $"Valor inválido para {name}. Aceitos: {string.Join(", ", Enum.GetValues<T>().Select(v => v.ParaCodigo()))}.";
}
