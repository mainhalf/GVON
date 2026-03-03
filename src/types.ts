export interface User {
  id: number;
  username: string;
  role: 'admin' | 'partner' | 'paid' | 'free';
  organization: string;
}

export interface Network {
  id: number;
  name_cn: string;
  name_en: string;
}

export interface SubNetwork {
  id: number;
  network_id: number;
  code: string;
  name_cn: string;
  name_en: string;
  organization: string;
  build_time: string;
  data_start_time: string;
  coverage: string;
  share_type: 'public' | 'own' | 'partner';
  station_count: number;
  main_params: string;
  qc_standard: string;
}

export interface Station {
  id: number;
  sub_network_id: number;
  name_cn: string;
  name_en: string;
  organization: string;
  lat: number;
  lng: number;
  build_time: string;
  data_start_time: string;
  main_params: string;
  network_name_cn?: string;
  instrument_count: number;
  instrument_codes: string;
  continent?: string;
  country?: string;
  province?: string;
  city?: string;
  county?: string;
}

export interface Instrument {
  id: number;
  station_id: number;
  code: string;
  name_cn: string;
  name_en: string;
  principle: string;
  brand_model: string;
  install_year: number;
  admin_contact: string;
  update_frequency: string;
  params: string;
  data_start_time: string;
  status: 'normal' | 'abnormal';
}

export interface StationDataProduct {
  id: string;
  station_id: number;
  name: string;
  time_range: string;
  price: number;
  type: 'hourly' | 'daily' | 'monthly';
}

export interface ObservationData {
  id: number;
  instrument_id: number;
  timestamp: string;
  value: number;
  param_name: string;
  version: string;
}

export interface PurchasedData {
  id: number;
  user_id: number;
  station_id: number;
  instrument_id: number;
  data_range: string;
  purchase_time: string;
  price: number;
  station_name?: string;
  instrument_name?: string;
}
