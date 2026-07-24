export type Role = 'SUPER_ADMIN' | 'KIEROWNIK' | 'PRACOWNIK';
export type RfqStatus = 'NOWE' | 'WYSLANE' | 'ZAAKCEPTOWANE' | 'WSTRZYMANE';
export type OfferStatus = 'SZKIC' | 'WYSLANA' | 'ZAAKCEPTOWANA' | 'ODRZUCONA' | 'WSTRZYMANA';
export type OrderStatus = 'NOWE' | 'W_TOKU' | 'ZAMKNIETE' | 'ANULOWANE';
export type RabatType = 'PROCENT' | 'KWOTA';
export type GroupType = 'OPERACYJNA' | 'ZAKUPOWA';

export const RFQ_STATUSES: RfqStatus[] = ['NOWE','WYSLANE','ZAAKCEPTOWANE','WSTRZYMANE'];
export const OFFER_STATUSES: OfferStatus[] = ['SZKIC','WYSLANA','ZAAKCEPTOWANA','ODRZUCONA','WSTRZYMANA'];
export const ORDER_STATUSES: OrderStatus[] = ['NOWE','W_TOKU','ZAMKNIETE','ANULOWANE'];
