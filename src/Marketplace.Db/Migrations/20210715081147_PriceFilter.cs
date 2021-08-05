using Microsoft.EntityFrameworkCore.Migrations;

namespace Marketplace.Db.Migrations
{
    public partial class PriceFilter : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE public.""Offer""
SET ""Price""=LPAD(""Price"", 40, '0');
"
            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
