using System.Numerics;
using System.Text.Json;

namespace Marketplace.Backend.Offers
{
    public record OfferDto(ulong CollectionId, ulong TokenId, string Price, ulong QuoteId, string Seller, JsonDocument Metadata);
}
