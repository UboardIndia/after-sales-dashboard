export interface ProductMasterRow {
  Product: string;
  Brand: string;
  HasPriceList: string;
  HasRepairHistory: string;
}

export interface PriceListRow {
  Product: string;
  SparePart: string;
  MaxB2C: string;
  MinB2B: string;
  GST: string;
}

export interface RepairLogRow {
  Product: string;
  OrigEntry: string;
  Description: string;
  Cost: string;
}

export interface SparePartsData {
  productMaster: ProductMasterRow[];
  priceList: PriceListRow[];
  repairLog: RepairLogRow[];
}
