using System.Collections;
using System.Collections.Generic;
using System.Numerics;
using Marketplace.Backend.Offers;
using Marketplace.Backend.Sorting;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Marketplace.Backend.Serializing
{
    public class SortingParameterSchemaFilter : ISchemaFilter
    {
        public void Apply(OpenApiSchema schema, SchemaFilterContext context)
        {
            if (context.Type == typeof(SortingParameter))
            {
                schema.Type = "string";
                schema.Format = "string";
            }
        }
    }
}
