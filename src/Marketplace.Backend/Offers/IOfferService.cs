using System.Collections.Generic;
using System.Threading.Tasks;
using Marketplace.Backend.Sorting;

namespace Marketplace.Backend.Offers
{
    public interface IOfferService
    {
        Task<PaginationResult<OfferDto>> Get(OffersFilter filter, PaginationParameter parameter, IReadOnlyCollection<SortingParameter>? sorting);
    }
}
