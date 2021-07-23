using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Marketplace.Db.Migrations
{
    public partial class JsonMetadata : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "Offer");

            migrationBuilder.AddColumn<JsonDocument>(
                name: "Metadata",
                table: "Offer",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Offer_Metadata",
                table: "Offer",
                column: "Metadata");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Offer_Metadata",
                table: "Offer");

            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "Offer");

            migrationBuilder.AddColumn<string>(
                name: "Metadata",
                table: "Offer",
                type: "jsonb",
                nullable: false,
                defaultValue: "");
        }
    }
}
