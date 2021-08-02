using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Marketplace.Db.Migrations
{
    public partial class TokensTextSearch : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TokenTextSearch",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollectionId = table.Column<decimal>(type: "numeric(20,0)", nullable: false),
                    TokenId = table.Column<decimal>(type: "numeric(20,0)", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    Locale = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TokenTextSearch", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TokenTextSearch_CollectionId_TokenId_Locale",
                table: "TokenTextSearch",
                columns: new[] { "CollectionId", "TokenId", "Locale" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TokenTextSearch");
        }
    }
}
