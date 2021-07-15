using System.Numerics;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Marketplace.Backend.Serializing
{
    public class BigIntegerModelBinder : IModelBinder
    {
        public Task BindModelAsync(ModelBindingContext bindingContext)
        {
            var value = bindingContext.ValueProvider.GetValue(bindingContext.ModelName).FirstValue;
            if (value == null)
            {
                bindingContext.Result = ModelBindingResult.Success(null);
            }
            else
            {
                if (BigInteger.TryParse(value, out var model))
                {
                    bindingContext.Result = bindingContext.ModelType == typeof(BigInteger?) ? ModelBindingResult.Success((BigInteger?)model) : ModelBindingResult.Success(model);
                }
                else
                {
                    bindingContext.Result = ModelBindingResult.Failed();
                }
            }
            return Task.CompletedTask;
        }
    }
}