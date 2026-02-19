# Plan: Improve Excel Mapping UI

The user described the current Excel mapping UI as "in chaos". I will redesign the `ColumnMappingDialog` to provide better organization and visual clarity.

## Goal
Redesign `ColumnMappingDialog` with grouped fields, icons, and a more professional layout.

## Steps

### 1. Refactor mapping dialog layout
- Group `TARGET_FIELDS` into three logical categories:
    - **Penerima**: `recipient.name`, `recipient.phone`, `recipient.addressRaw`
    - **Barang**: `items[0].name`, `items[0].qty`, `items[0].unitPrice`, `items[0].totalPrice`
    - **Metadata**: `tag`
- Use card-like sections with icons and headings for each group.
- Improve the layout for better responsiveness.

### 2. Polish the Preview section
- Enhance the "Preview 3 Baris Pertama" section to be more readable.

### 3. Verification
- Upload an Excel file in the app.
- Confirm the `ColumnMappingDialog` appears with the new organized layout.
- Verify that auto-matching still works.
- Perform a successful import.

## Files to Modify
- `src/components/lyncis/intake/column-mapping-dialog.tsx`
