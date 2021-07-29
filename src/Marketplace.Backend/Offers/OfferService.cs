using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Marketplace.Db;
using Marketplace.Db.Models;
using Microsoft.EntityFrameworkCore;
using Marketplace.Backend.Base58;
using Marketplace.Backend.Sorting;

namespace Marketplace.Backend.Offers
{
    public class OfferService: IOfferService
    {
        private readonly MarketplaceDbContext _marketplaceDbContext;
        private readonly Configuration _configuration;

        private static readonly Dictionary<string, Expression<Func<Offer, object>>> _sortMappings = new(StringComparer.InvariantCultureIgnoreCase)
            {
                {nameof(Offer.Price), o => o.Price},
                {nameof(Offer.TokenId), o => o.TokenId},
                {nameof(Offer.CreationDate), o => o.CreationDate},
            };

        public OfferService(MarketplaceDbContext marketplaceDbContext, Configuration configuration)
        {
            _marketplaceDbContext = marketplaceDbContext;
            _configuration = configuration;
        }

        public Task<PaginationResult<OfferDto>> Get(OffersFilter filter, PaginationParameter parameter, IReadOnlyCollection<SortingParameter>? sorting)
        {
            return _marketplaceDbContext.Offers
                .ApplyFilter(filter)
                .Where(o => o.OfferStatus == OfferStatus.Active)
                .AsNoTrackingWithIdentityResolution()
                .Order(sorting, _sortMappings)
                .Select(MapOfferDto())
                .PaginateAsync(parameter);
        }

        private static Expression<Func<Offer, OfferDto>> MapOfferDto()
        {
            return o => new OfferDto(o.CollectionId, o.TokenId, o.Price.ToString(), o.QuoteId, o.Seller, o.Metadata, o.CreationDate);
        }
    }
}
