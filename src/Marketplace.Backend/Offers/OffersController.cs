using System.Collections.Generic;
using System.Threading.Tasks;
using Marketplace.Backend.Sorting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Swashbuckle.AspNetCore.Annotations;

namespace Marketplace.Backend.Offers
{
    [ApiController]
    [Route("[controller]")]
    public class OffersController : ControllerBase
    {
        private readonly IOfferService _offerService;

        public OffersController(IOfferService offerService)
        {
            _offerService = offerService;
        }

        private const string GetSortDescription =
            "Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId), asc(CreationDate), desc(CreationDate).";
        [HttpGet]
        [Route("")]
        public Task<PaginationResult<OfferDto>> Get(
            [FromQuery] PaginationParameter paginationParameter,
            [FromQuery] OffersFilter filter,
            [FromQuery, SwaggerParameter(GetSortDescription)] List<SortingParameter>? sort)
        {
            return _offerService.Get(filter, paginationParameter, sort);
        }
    }
}
