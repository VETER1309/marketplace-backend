using System.Collections.Generic;
using System.Threading.Tasks;

namespace Marketplace.Backend.Offers
{
    public interface IOfferService
    {
        Task<PaginationResult<OfferDto>> Get(OffersFilter filter, PaginationParameter parameter);
    }
}