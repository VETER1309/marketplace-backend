using Marketplace.Backend.Serializing;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Backend.Sorting
{
    [ModelBinder(typeof(SortingParameterModelBinder))]
    public class SortingParameter
    {
        public string Column { get; set; }

        public SortingOrder Order { get; set; }
    }
}
