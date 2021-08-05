using System;
using System.Numerics;
using System.Text.Json;

namespace Marketplace.Backend.Trades
{
    public record TradeDto(DateTime TradeDate, ulong CollectionId, ulong TokenId, string Price, ulong QuoteId, string Seller,
        string Buyer, JsonDocument Metadata);
}
