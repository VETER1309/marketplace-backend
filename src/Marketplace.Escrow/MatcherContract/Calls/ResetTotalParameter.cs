using Polkadot.BinarySerializer;

namespace Marketplace.Escrow.MatcherContract.Calls
{
    public class ResetTotalParameter : IContractCallParameter
    {
        [Serialize(0)]
        public ulong QuoteId { get; set; }
    }
}