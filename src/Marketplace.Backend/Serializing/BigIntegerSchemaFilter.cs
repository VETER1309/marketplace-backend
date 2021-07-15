using System.Numerics;
using Marketplace.Backend.Offers;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Marketplace.Backend.Serializing
{
    public class BigIntegerSchemaFilter : ISchemaFilter
    {
        public void Apply(OpenApiSchema schema, SchemaFilterContext context)
        {
            if (context.Type == typeof(BigInteger) || context.Type == typeof(BigInteger?))
            {
                schema.Type = "string";
                schema.Format = "string";
            }
        }
    }
}