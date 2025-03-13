import { ApiProperty } from "@nestjs/swagger";
import { SvgGenerationWithVersionData } from "./svg-generation-with-version.data";

export class PaginatedSvgGenerationResponse {
    @ApiProperty({
        description: "SVG generations",
        type: [SvgGenerationWithVersionData],
    })
    public readonly items: SvgGenerationWithVersionData[];

    @ApiProperty({ description: "Total count of items", example: 100 })
    public readonly total: number;

    @ApiProperty({ description: "Current page number", example: 1 })
    public readonly page: number;

    @ApiProperty({ description: "Page size", example: 20 })
    public readonly pageSize: number;

    @ApiProperty({ description: "Total number of pages", example: 5 })
    public readonly totalPages: number;

    public constructor(
        items: SvgGenerationWithVersionData[],
        total: number,
        page: number,
        pageSize: number
    ) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
        this.totalPages = Math.ceil(total / pageSize);
    }
}
