using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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

        [HttpGet]
        [Route("")]
        public Task<PaginationResult<OfferDto>> Get([FromQuery] PaginationParameter paginationParameter, [FromQuery] OffersFilter filter)
        {
            return _offerService.Get(filter, paginationParameter);
        }
    }
}
