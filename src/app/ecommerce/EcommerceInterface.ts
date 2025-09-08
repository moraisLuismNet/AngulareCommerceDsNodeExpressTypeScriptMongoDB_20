export interface IGenre {
  IdMusicGenre?: number;
  NameMusicGenre: string;
  TotalGroups?: number;
}

export interface IGroup {
  IdGroup: number;
  NameGroup: string;
  ImageGroup: string | null;
  Photo?: File | null;
  PhotoName?: string | null;
  TotalRecords?: number;
  MusicGenreId: number | null;
  NameMusicGenre: string;
  MusicGenre: string;
}

export interface IRecord {
  _id?: string;  // MongoDB _id
  IdRecord: number;
  TitleRecord?: string;  // Made optional for backward compatibility
  title?: string;       // Added for consistency with backend
  YearOfPublication: number | null;
  Price: number;
  stock: number;
  Discontinued: boolean;
  GroupId: number | null;
  GroupName: string;
  NameGroup: string;
  nameGroup?: string;  // Alternative casing for backend compatibility
  inCart?: boolean;
  Amount?: number;
  ImageRecord?: string | null;  // Made optional for backward compatibility
  imageRecord?: string | null;  // Added for consistency with backend
  Photo: File | null;
  PhotoName: string | null;
  data?: {
    stock?: number;
    [key: string]: any;
  };
}

export interface ICartDetail {
  RecordTitle: string;
  IdCartDetail?: number;
  RecordId: number;
  Amount: number;
  CartId: number;
  Record?: IRecord;
  TitleRecord?: string;
  GroupName?: string;
  Price?: number;
  Total?: number;
  // camelCase for template compatibility
  idCartDetail?: number;
  recordId?: number;
  amount?: number;
  cartId?: number;
  titleRecord?: string;
  groupName?: string;
  price?: number;
  total?: number;
  imageRecord?: string | null;

  // Extended properties for UI
  record?: {
    stock: number;
    data: {
      stock: number;
      [key: string]: any;
    };
  };
}

export interface ICart {
  items?: ICartDetail[]; // Corrected property name and type
  CartDetails?: ICartDetail[]; // Added for backward compatibility
  IdCart: number;
  UserEmail: string;
  TotalPrice: number;
  Enabled?: boolean;
}

export interface IOrder {
  IdOrder: number;
  OrderDate: string;
  PaymentMethod: string;
  Total: number;
  UserEmail: string;
  CartId: number;
  OrderDetails: IOrderDetail[];
}

export interface IOrderDetail {
  IdOrderDetail: number;
  OrderId: number;
  RecordId: number;
  RecordTitle?: string;
  Amount: number;
  Price: number;
  Total: number;
}

export interface IUser {
  Email: string;
  Role: string;
  Name?: string;
}

export interface CartDetailItem {
  idCartDetail: number;
  cartId: number;
  recordId: number;
  imageRecord: string;
  titleRecord: string;
  groupName: string;
  amount: number;
  price: number;
  total: number;
}

export interface ExtendedCartDetail extends Omit<ICartDetail, 'RecordTitle' | 'titleRecord'> {
  // Properties for template binding
  titleRecord: string;
  GroupName: string;
  amount: number;
  price: number;
  total: number;
  imageRecord: string | null;
  
  // Additional properties
  stock: number;
  groupName: string;
  
  // Record details
  RecordTitle: string;
  RecordPrice: number;
  RecordImage: string;
  RecordArtist: string;
  RecordGenre: string;
  RecordYear: string;
  Quantity: number;
  Subtotal: number;
  
  // Add any additional properties that might come from the API
  recordDetails?: {
    stock: number;
    title: string;
    image: string;
    nameGroup: string;
    [key: string]: any;
  };
  
  // Allow any other properties
  [key: string]: any;
}

export interface GroupResponse {
  $values?: IGroup[];
}
