using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Marketplace.Backend.Sorting;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Marketplace.Backend.Serializing
{
    public class SortingParameterModelBinder : IModelBinder
    {
        private Regex _parser = new(@"(?<order>asc|desc)\((?<column>\w+)\)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public Task BindModelAsync(ModelBindingContext bindingContext)
        {
            if (bindingContext.ModelType != typeof(SortingParameter))
            {
                return Task.CompletedTask;
            }

            var value = bindingContext.ValueProvider.GetValue(bindingContext.ModelName).FirstValue;
            if (value == null)
            {
                return Task.CompletedTask;
            }

            var match = _parser.Match(value);
            if (match.Success)
            {
                bindingContext.Result = ModelBindingResult.Success(new SortingParameter()
                {
                    Column = match.Groups["column"].Value,
                    Order = string.Equals("asc", match.Groups["order"].Value, StringComparison.InvariantCultureIgnoreCase) ? SortingOrder.Asc : SortingOrder.Desc
                });
            }
            else
            {
                bindingContext.Result = ModelBindingResult.Failed();
            }
            return Task.CompletedTask;
        }
    }
}
