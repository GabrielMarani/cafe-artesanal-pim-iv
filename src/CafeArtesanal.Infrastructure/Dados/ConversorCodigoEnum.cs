using CafeArtesanal.Domain.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CafeArtesanal.Infrastructure.Dados;

/// <summary>Grava enums como os códigos snake_case das colunas ENUM do banco.</summary>
public sealed class ConversorCodigoEnum<T>() : ValueConverter<T, string>(
    valor => valor.ParaCodigo(),
    codigo => CodigoEnum.DeCodigo<T>(codigo))
    where T : struct, Enum;
