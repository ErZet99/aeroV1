export type Role = 'SUPER_ADMIN' | 'KIEROWNIK' | 'PRACOWNIK';
export type RfqStatus = 'NOWE' | 'WYSLANE' | 'ZAAKCEPTOWANE' | 'WSTRZYMANE';
export type OfferStatus = 'SZKIC' | 'WYSLANA' | 'ZAAKCEPTOWANA' | 'ODRZUCONA' | 'WSTRZYMANA';
export type CostSource = 'ROLLUP' | 'MANUAL';
export type RabatType = 'PROCENT' | 'KWOTA';
export type GroupType = 'OPERACYJNA' | 'ZAKUPOWA';

export const RFQ_STATUSES: RfqStatus[] = ['NOWE','WYSLANE','ZAAKCEPTOWANE','WSTRZYMANE'];
export const OFFER_STATUSES: OfferStatus[] = ['SZKIC','WYSLANA','ZAAKCEPTOWANA','ODRZUCONA','WSTRZYMANA'];
