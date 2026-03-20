import type { Estimate, EstimateLineItem, Client, EstimateChangeOrder } from "@proestimate/shared/types";
import { groupLineItems, TIER_LABELS, fmt, type GroupedLines } from "./pdf/pdfStyles";
import type { CompanyInfo } from "./EstimatePDF";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

/* -- Color palette (matches PDF) -- */

const NAVY = "1e3a5f";
const NAVY_LIGHT = "2c5282";
const GRAY_BG = "f7f8fa";
const GRAY_BORDER = "d0d5dd";
const GRAY_TEXT = "667085";
const WHITE = "ffffff";
const BLACK = "1a1a1a";

/* -- Default company fallback -- */

const DEFAULT_COMPANY: CompanyInfo = {
  name: "MHP Estimate",
  address: "",
  city_state_zip: "",
  email: "info@mhpestimate.cloud",
};

/* -- Border helper -- */

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: GRAY_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: GRAY_BORDER },
  left: { style: BorderStyle.SINGLE, size: 1, color: GRAY_BORDER },
  right: { style: BorderStyle.SINGLE, size: 1, color: GRAY_BORDER },
} as const;

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
  left: { style: BorderStyle.NONE, size: 0, color: WHITE },
  right: { style: BorderStyle.NONE, size: 0, color: WHITE },
} as const;

/* -- Section heading builder -- */

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    children: [
      new TextRun({
        text,
        bold: true,
        color: WHITE,
        size: 22,
        font: "Helvetica",
      }),
    ],
  });
}

/* -- Table header cell builder -- */

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: NAVY_LIGHT, fill: NAVY_LIGHT },
    borders: thinBorder,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text.toUpperCase(),
            bold: true,
            color: WHITE,
            size: 16,
            font: "Helvetica",
          }),
        ],
      }),
    ],
  });
}

/* -- Data cell builder -- */

function dataCell(text: string, width: number, options?: { bold?: boolean; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; shading?: string }): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: thinBorder,
    shading: options?.shading ? { type: ShadingType.SOLID, color: options.shading, fill: options.shading } : undefined,
    children: [
      new Paragraph({
        alignment: options?.alignment ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: options?.bold,
            size: 18,
            color: BLACK,
            font: "Helvetica",
          }),
        ],
      }),
    ],
  });
}

/* -- Build company header section -- */

function buildHeader(company: CompanyInfo, estimate: Estimate, estimateDate: string, validThrough: string | null): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: company.name,
          bold: true,
          color: NAVY,
          size: 40,
          font: "Helvetica",
        }),
      ],
    })
  );

  const contactParts: string[] = [];
  if (company.address) contactParts.push(company.address);
  if (company.city_state_zip) contactParts.push(company.city_state_zip);
  contactParts.push(company.email);
  if (company.phone) contactParts.push(company.phone);

  paragraphs.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: contactParts.join("  |  "),
          color: GRAY_TEXT,
          size: 16,
          font: "Helvetica",
        }),
      ],
    })
  );

  paragraphs.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 3, color: NAVY, space: 1 },
      },
      children: [],
    })
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: "ESTIMATE",
          bold: true,
          color: NAVY,
          size: 48,
          font: "Helvetica",
        }),
      ],
    })
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 20 },
      children: [
        new TextRun({ text: estimate.estimate_number, color: GRAY_TEXT, size: 18, font: "Helvetica" }),
      ],
    })
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 20 },
      children: [
        new TextRun({ text: `Date: ${estimateDate}`, color: GRAY_TEXT, size: 18, font: "Helvetica" }),
      ],
    })
  );

  if (validThrough) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: `Valid Through: ${validThrough}`, color: GRAY_TEXT, size: 18, font: "Helvetica" }),
        ],
      })
    );
  } else {
    paragraphs.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  return paragraphs;
}

/* -- Build client info table -- */

function buildClientInfoTable(client: Client | null, estimate: Estimate): Table {
  const clientLines: string[] = [];
  if (client) {
    clientLines.push(client.full_name);
    if (client.address_line1) clientLines.push(client.address_line1);
    if (client.address_line2) clientLines.push(client.address_line2);
    const cityStateZip = [client.city, client.state].filter(Boolean).join(", ") + (client.zip ? ` ${client.zip}` : "");
    if (cityStateZip.trim()) clientLines.push(cityStateZip);
    if (client.email) clientLines.push(client.email);
    if (client.phone) clientLines.push(client.phone);
  } else {
    clientLines.push("No client assigned");
  }

  const projectLines: string[] = [];
  projectLines.push(`Type: ${estimate.project_type}`);
  projectLines.push(`Tier: ${TIER_LABELS[estimate.tier] ?? estimate.tier}`);
  if (estimate.project_address) projectLines.push(`Address: ${estimate.project_address}`);
  if (estimate.site_conditions) projectLines.push(`Site Conditions: ${estimate.site_conditions}`);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            shading: { type: ShadingType.SOLID, color: GRAY_BG, fill: GRAY_BG },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({ text: "CLIENT INFORMATION", bold: true, color: NAVY, size: 16, font: "Helvetica" }),
                ],
              }),
              ...clientLines.map(
                (line) =>
                  new Paragraph({
                    spacing: { after: 20 },
                    children: [new TextRun({ text: line, size: 18, color: BLACK, font: "Helvetica" })],
                  })
              ),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            shading: { type: ShadingType.SOLID, color: GRAY_BG, fill: GRAY_BG },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({ text: "PROJECT DETAILS", bold: true, color: NAVY, size: 16, font: "Helvetica" }),
                ],
              }),
              ...projectLines.map(
                (line) =>
                  new Paragraph({
                    spacing: { after: 20 },
                    children: [new TextRun({ text: line, size: 18, color: BLACK, font: "Helvetica" })],
                  })
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

/* -- Build scope sections -- */

function buildScopeSection(estimate: Estimate): (Table | Paragraph)[] {
  const elements: (Table | Paragraph)[] = [];

  if (estimate.scope_inclusions.length === 0 && estimate.scope_exclusions.length === 0) {
    return elements;
  }

  elements.push(new Paragraph({ spacing: { before: 200 }, children: [] }));

  const cells: TableCell[] = [];

  if (estimate.scope_inclusions.length > 0) {
    cells.push(
      new TableCell({
        width: { size: estimate.scope_exclusions.length > 0 ? 50 : 100, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { type: ShadingType.SOLID, color: GRAY_BG, fill: GRAY_BG },
        children: [
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "SCOPE INCLUSIONS", bold: true, color: NAVY, size: 16, font: "Helvetica" }),
            ],
          }),
          ...estimate.scope_inclusions.map(
            (item) =>
              new Paragraph({
                spacing: { after: 20 },
                children: [new TextRun({ text: `\u2022 ${item}`, size: 18, color: BLACK, font: "Helvetica" })],
              })
          ),
        ],
      })
    );
  }

  if (estimate.scope_exclusions.length > 0) {
    cells.push(
      new TableCell({
        width: { size: estimate.scope_inclusions.length > 0 ? 50 : 100, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { type: ShadingType.SOLID, color: GRAY_BG, fill: GRAY_BG },
        children: [
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "SCOPE EXCLUSIONS", bold: true, color: NAVY, size: 16, font: "Helvetica" }),
            ],
          }),
          ...estimate.scope_exclusions.map(
            (item) =>
              new Paragraph({
                spacing: { after: 20 },
                children: [new TextRun({ text: `\u2022 ${item}`, size: 18, color: BLACK, font: "Helvetica" })],
              })
          ),
        ],
      })
    );
  }

  if (cells.length > 0) {
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: cells })],
      })
    );
  }

  return elements;
}

/* -- Build line items tables (grouped by category) -- */

function buildLineItemsTables(groups: GroupedLines[]): (Table | Paragraph)[] {
  const elements: (Table | Paragraph)[] = [];

  for (const group of groups) {
    elements.push(sectionHeading(group.label));

    const rows: TableRow[] = [];

    rows.push(
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("Description", 40),
          headerCell("Qty", 12),
          headerCell("Unit", 12),
          headerCell("Unit Price", 18),
          headerCell("Total", 18),
        ],
      })
    );

    group.items.forEach((li, idx) => {
      const qty = Number(li.quantity) || 0;
      const price = Number(li.unit_price) || 0;
      const extended = Number(li.extended_price) || qty * price;
      const rowShading = idx % 2 === 1 ? GRAY_BG : undefined;

      rows.push(
        new TableRow({
          children: [
            dataCell(li.description, 40, { shading: rowShading }),
            dataCell(String(qty), 12, { alignment: AlignmentType.RIGHT, shading: rowShading }),
            dataCell(li.unit ?? "", 12, { shading: rowShading }),
            dataCell(`$${fmt(price)}`, 18, { alignment: AlignmentType.RIGHT, shading: rowShading }),
            dataCell(`$${fmt(extended)}`, 18, { alignment: AlignmentType.RIGHT, shading: rowShading }),
          ],
        })
      );
    });

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 64, type: WidthType.PERCENTAGE },
            columnSpan: 3,
            borders: thinBorder,
            shading: { type: ShadingType.SOLID, color: "edf2f7", fill: "edf2f7" },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${group.label} Subtotal`,
                    bold: true,
                    color: NAVY,
                    size: 18,
                    font: "Helvetica",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 36, type: WidthType.PERCENTAGE },
            columnSpan: 2,
            borders: thinBorder,
            shading: { type: ShadingType.SOLID, color: "edf2f7", fill: "edf2f7" },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `$${fmt(group.subtotal)}`,
                    bold: true,
                    color: NAVY,
                    size: 18,
                    font: "Helvetica",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      })
    );
  }

  return elements;
}

/* -- Financial summary row builder -- */

function finRow(label: string, value: string, alt: boolean): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: alt ? { type: ShadingType.SOLID, color: GRAY_BG, fill: GRAY_BG } : undefined,
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label, color: GRAY_TEXT, size: 18, font: "Helvetica" }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: alt ? { type: ShadingType.SOLID, color: GRAY_BG, fill: GRAY_BG } : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: value, bold: true, color: BLACK, size: 18, font: "Helvetica" }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* -- Build financial summary table -- */

function buildFinancialSummary(estimate: Estimate): (Table | Paragraph)[] {
  const elements: (Table | Paragraph)[] = [];

  elements.push(new Paragraph({ spacing: { before: 300 }, children: [] }));

  const rows: TableRow[] = [
    finRow("Materials Subtotal", `$${fmt(Number(estimate.materials_subtotal))}`, false),
    finRow("Labor Subtotal", `$${fmt(Number(estimate.labor_subtotal))}`, true),
    finRow("Subcontractor Total", `$${fmt(Number(estimate.subcontractor_total))}`, false),
    finRow("Permits & Fees", `$${fmt(Number(estimate.permits_fees))}`, true),
    finRow("Overhead & Profit", `$${fmt(Number(estimate.overhead_profit))}`, false),
    finRow("Contingency", `$${fmt(Number(estimate.contingency))}`, true),
    finRow("Tax", `$${fmt(Number(estimate.tax))}`, false),
  ];

  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "GRAND TOTAL", bold: true, color: WHITE, size: 22, font: "Helvetica" }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `$${fmt(Number(estimate.grand_total))}`,
                  bold: true,
                  color: WHITE,
                  size: 22,
                  font: "Helvetica",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  elements.push(
    new Table({
      width: { size: 50, type: WidthType.PERCENTAGE },
      rows,
    })
  );

  return elements;
}

/* -- Build change orders section -- */

function buildChangeOrders(changeOrders: EstimateChangeOrder[], estimate: Estimate): (Table | Paragraph)[] {
  if (changeOrders.length === 0) return [];

  const elements: (Table | Paragraph)[] = [];

  elements.push(sectionHeading("Approved Change Orders"));

  const rows: TableRow[] = [];

  rows.push(
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("#", 10),
        headerCell("Description", 50),
        headerCell("Timeline", 20),
        headerCell("Cost Impact", 20),
      ],
    })
  );

  changeOrders.forEach((co, idx) => {
    const rowShading = idx % 2 === 1 ? GRAY_BG : undefined;
    const costSign = co.cost_impact >= 0 ? "+" : "";
    rows.push(
      new TableRow({
        children: [
          dataCell(`CO #${co.change_number}`, 10, { shading: rowShading }),
          dataCell(co.description, 50, { shading: rowShading }),
          dataCell(co.timeline_impact ?? "\u2014", 20, { shading: rowShading }),
          dataCell(`${costSign}$${fmt(Math.abs(Number(co.cost_impact)))}`, 20, {
            alignment: AlignmentType.RIGHT,
            shading: rowShading,
          }),
        ],
      })
    );
  });

  const totalImpact = changeOrders.reduce((sum, co) => sum + Number(co.cost_impact), 0);
  const totalSign = totalImpact >= 0 ? "+" : "";

  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 80, type: WidthType.PERCENTAGE },
          columnSpan: 3,
          borders: thinBorder,
          shading: { type: ShadingType.SOLID, color: "edf2f7", fill: "edf2f7" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Total Change Order Impact",
                  bold: true,
                  color: NAVY,
                  size: 18,
                  font: "Helvetica",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { type: ShadingType.SOLID, color: "edf2f7", fill: "edf2f7" },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `${totalSign}$${fmt(Math.abs(totalImpact))}`,
                  bold: true,
                  color: NAVY,
                  size: 18,
                  font: "Helvetica",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 80, type: WidthType.PERCENTAGE },
          columnSpan: 3,
          borders: thinBorder,
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "ADJUSTED GRAND TOTAL", bold: true, color: WHITE, size: 22, font: "Helvetica" }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `$${fmt(Number(estimate.grand_total))}`,
                  bold: true,
                  color: WHITE,
                  size: 22,
                  font: "Helvetica",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    })
  );

  return elements;
}

/* -- Build terms & conditions -- */

function buildTerms(warrantyText?: string | null, termsConditions?: string | null): Paragraph[] {
  const elements: Paragraph[] = [];

  const termsText =
    warrantyText || termsConditions
      ? [warrantyText, termsConditions].filter(Boolean).join("\n\n")
      : "This estimate is valid for 30 days from the date of issue unless otherwise specified. Prices are subject to change based on material availability and site conditions. A signed acceptance of this estimate constitutes authorization to proceed with the work described above.";

  elements.push(new Paragraph({ spacing: { before: 400 }, children: [] }));

  elements.push(
    new Paragraph({
      spacing: { after: 40 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: GRAY_BORDER, space: 1 },
      },
      children: [],
    })
  );

  elements.push(
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: "Terms & Conditions",
          bold: true,
          color: NAVY,
          size: 20,
          font: "Helvetica",
        }),
      ],
    })
  );

  const lines = termsText.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    elements.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: line,
            color: GRAY_TEXT,
            size: 14,
            font: "Helvetica",
          }),
        ],
      })
    );
  }

  return elements;
}

/* -- Public API -- */

/** Download DOCX to the browser. Same signature as generateEstimatePDF. */
export async function generateEstimateDOCX(
  estimate: Estimate,
  lineItems: EstimateLineItem[],
  client: Client | null,
  company?: CompanyInfo,
  changeOrders?: EstimateChangeOrder[]
): Promise<void> {
  const comp = company ?? DEFAULT_COMPANY;
  const cos = changeOrders ?? [];
  const groups = groupLineItems(lineItems);

  const estimateDate = new Date(estimate.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const validThrough = estimate.valid_through
    ? new Date(estimate.valid_through).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const headerParagraphs = buildHeader(comp, estimate, estimateDate, validThrough);
  const clientTable = buildClientInfoTable(client, estimate);
  const scopeElements = buildScopeSection(estimate);
  const lineItemElements = buildLineItemsTables(groups);
  const financialElements = buildFinancialSummary(estimate);
  const changeOrderElements = buildChangeOrders(cos, estimate);
  const termsElements = buildTerms(
    (estimate as any).warranty_text,
    (estimate as any).terms_conditions
  );

  const doc = new Document({
    creator: comp.name,
    title: `Estimate ${estimate.estimate_number}`,
    description: `Construction estimate ${estimate.estimate_number} for ${client?.full_name ?? "client"}`,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
            margin: {
              top: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.6),
              right: convertInchesToTwip(0.6),
            },
          },
        },
        headers: {
          default: new Header({
            children: [],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${comp.name}  |  ${estimate.estimate_number}  |  Page `,
                    color: GRAY_TEXT,
                    size: 14,
                    font: "Helvetica",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: GRAY_TEXT,
                    size: 14,
                    font: "Helvetica",
                  }),
                  new TextRun({
                    text: " of ",
                    color: GRAY_TEXT,
                    size: 14,
                    font: "Helvetica",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    color: GRAY_TEXT,
                    size: 14,
                    font: "Helvetica",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...headerParagraphs,
          clientTable,
          ...scopeElements,
          ...lineItemElements,
          ...financialElements,
          ...changeOrderElements,
          ...termsElements,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${estimate.estimate_number}.docx`);
}
