import type { ComponentGroup, ComponentKind, ComponentKindSupplier, Operation, Supplier } from '@/types/models';

export const seedCascadeSuppliers: Supplier[] = [
  { id: 1, name: "Śrubres", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 2, name: "Asmet", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 3, name: "Euro-Met", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 4, name: "Webus", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 5, name: "Versa", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 6, name: "McMaster", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 7, name: "Elesa Ganter", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 8, name: "OEM Technik", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 9, name: "RUD", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 10, name: "Silno", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 11, name: "Komstal", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 12, name: "Pro-Mag", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 13, name: "Rader", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 14, name: "Lee-Spring", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 15, name: "Moris", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 16, name: "Konsorcjum", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 17, name: "Bowim", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 18, name: "Fleximo", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 19, name: "Pro-Hurt", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 20, name: "Sklejka.pl", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 21, name: "Zatorski", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 22, name: "Konsil", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 23, name: "Ensinger", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 24, name: "Akrostal", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 25, name: "Stalton", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 26, name: "Adamet", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 27, name: "Aluteam", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 28, name: "Polting", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 29, name: "Joongpol", nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
];

export const seedComponentGroups: ComponentGroup[] = [
  { id: 1, code: 'KOOPERACJA', groupType: 'OPERACYJNA', labelPL: "Kooperacja", sort: 1, active: true },
  { id: 2, code: 'WEWNETRZNE', groupType: 'OPERACYJNA', labelPL: "Wewnętrzne", sort: 2, active: true },
  { id: 3, code: 'NORMATYWA', groupType: 'ZAKUPOWA', labelPL: "Normatywa", sort: 3, active: true },
  { id: 4, code: 'MATERIALY_PRODUKCYJNE', groupType: 'ZAKUPOWA', labelPL: "Materiały produkcyjne", sort: 4, active: true },
  { id: 5, code: 'AEROPARTS', groupType: 'ZAKUPOWA', labelPL: "Aeroparts", sort: 5, active: true },
];

export const seedComponentKinds: ComponentKind[] = [
  {
    "id": 1,
    "groupId": 1,
    "code": "OBROBKA_CNC",
    "labelPL": "Obróbka CNC",
    "sort": 1,
    "active": true
  },
  {
    "id": 2,
    "groupId": 1,
    "code": "OBROBKA_EDM",
    "labelPL": "Obróbka EDM",
    "sort": 2,
    "active": true
  },
  {
    "id": 3,
    "groupId": 1,
    "code": "OBROBKA_PLOTER",
    "labelPL": "Obróbka ploter",
    "sort": 3,
    "active": true
  },
  {
    "id": 4,
    "groupId": 1,
    "code": "OBROBKA_CIEPLNA",
    "labelPL": "Obróbka cieplna",
    "sort": 4,
    "active": true
  },
  {
    "id": 5,
    "groupId": 1,
    "code": "OBROBKA_POWIERZCHNI",
    "labelPL": "Obróbka powierzchni",
    "sort": 5,
    "active": true
  },
  {
    "id": 6,
    "groupId": 1,
    "code": "BADANIA",
    "labelPL": "Badania",
    "sort": 6,
    "active": true
  },
  {
    "id": 7,
    "groupId": 1,
    "code": "GIECIE",
    "labelPL": "Gięcie",
    "sort": 7,
    "active": true
  },
  {
    "id": 8,
    "groupId": 1,
    "code": "WALCOWANIE",
    "labelPL": "Walcowanie",
    "sort": 8,
    "active": true
  },
  {
    "id": 9,
    "groupId": 1,
    "code": "SPAWANIE",
    "labelPL": "Spawanie",
    "sort": 9,
    "active": true
  },
  {
    "id": 10,
    "groupId": 1,
    "code": "ZWIJANIE",
    "labelPL": "Zwijanie",
    "sort": 10,
    "active": true
  },
  {
    "id": 11,
    "groupId": 1,
    "code": "CERTYFIKACJA",
    "labelPL": "Certyfikacja",
    "sort": 11,
    "active": true
  },
  {
    "id": 12,
    "groupId": 1,
    "code": "CIECIE",
    "labelPL": "Cięcie",
    "sort": 12,
    "active": true
  },
  {
    "id": 13,
    "groupId": 1,
    "code": "CIECIE_GIECIE",
    "labelPL": "Cięcie + gięcie",
    "sort": 13,
    "active": true
  },
  {
    "id": 14,
    "groupId": 1,
    "code": "DRUK_3D_ZEW",
    "labelPL": "Druk 3D zew.",
    "sort": 14,
    "active": true
  },
  {
    "id": 15,
    "groupId": 1,
    "code": "ZNAKOWANIE",
    "labelPL": "Znakowanie",
    "sort": 15,
    "active": true
  },
  {
    "id": 16,
    "groupId": 1,
    "code": "POWLOKI",
    "labelPL": "Powłoki",
    "sort": 16,
    "active": true
  },
  {
    "id": 17,
    "groupId": 1,
    "code": "KOMPONENTY_HANDLOWE",
    "labelPL": "Komponenty handlowe",
    "sort": 17,
    "active": true
  },
  {
    "id": 18,
    "groupId": 1,
    "code": "POKROWCE",
    "labelPL": "Pokrowce",
    "sort": 18,
    "active": true
  },
  {
    "id": 19,
    "groupId": 1,
    "code": "NAKLEJKI",
    "labelPL": "Naklejki",
    "sort": 19,
    "active": true
  },
  {
    "id": 20,
    "groupId": 1,
    "code": "TRANSPORT",
    "labelPL": "Transport",
    "sort": 20,
    "active": true
  },
  {
    "id": 21,
    "groupId": 1,
    "code": "INNE",
    "labelPL": "Inne",
    "sort": 21,
    "active": true
  },
  {
    "id": 22,
    "groupId": 2,
    "code": "SPAWANIE",
    "labelPL": "Spawanie",
    "sort": 1,
    "active": true
  },
  {
    "id": 23,
    "groupId": 2,
    "code": "MONTAZ",
    "labelPL": "Montaż",
    "sort": 2,
    "active": true
  },
  {
    "id": 24,
    "groupId": 2,
    "code": "DRUK_3D_WEW",
    "labelPL": "Druk 3D wew.",
    "sort": 3,
    "active": true
  },
  {
    "id": 25,
    "groupId": 2,
    "code": "TRANSPORT",
    "labelPL": "Transport",
    "sort": 4,
    "active": true
  },
  {
    "id": 26,
    "groupId": 2,
    "code": "PROJEKTOWANIE",
    "labelPL": "Projektowanie",
    "sort": 5,
    "active": true
  },
  {
    "id": 27,
    "groupId": 2,
    "code": "KONTROLA_JAKOSCI",
    "labelPL": "Kontrola jakości",
    "sort": 6,
    "active": true
  },
  {
    "id": 28,
    "groupId": 3,
    "code": "KOMPONENTY_HANDLOWE_MET",
    "labelPL": "Komponenty handlowe met.",
    "sort": 1,
    "active": true
  },
  {
    "id": 29,
    "groupId": 3,
    "code": "KOMPONENTY_HANDLOWE_CAL",
    "labelPL": "Komponenty handlowe cal.",
    "sort": 2,
    "active": true
  },
  {
    "id": 30,
    "groupId": 3,
    "code": "IMPORT_USA",
    "labelPL": "Import USA",
    "sort": 3,
    "active": true
  },
  {
    "id": 31,
    "groupId": 3,
    "code": "MCMASTER",
    "labelPL": "McMaster",
    "sort": 4,
    "active": true
  },
  {
    "id": 32,
    "groupId": 3,
    "code": "ELESA_GANTER",
    "labelPL": "Elesa Ganter",
    "sort": 5,
    "active": true
  },
  {
    "id": 33,
    "groupId": 3,
    "code": "KIPP",
    "labelPL": "KIPP",
    "sort": 6,
    "active": true
  },
  {
    "id": 34,
    "groupId": 3,
    "code": "NORELEM",
    "labelPL": "Norelem",
    "sort": 7,
    "active": true
  },
  {
    "id": 35,
    "groupId": 3,
    "code": "ZAWIESIA",
    "labelPL": "Zawiesia",
    "sort": 8,
    "active": true
  },
  {
    "id": 36,
    "groupId": 3,
    "code": "KOLA",
    "labelPL": "Koła",
    "sort": 9,
    "active": true
  },
  {
    "id": 37,
    "groupId": 3,
    "code": "SPREZYNY",
    "labelPL": "Sprężyny",
    "sort": 10,
    "active": true
  },
  {
    "id": 38,
    "groupId": 3,
    "code": "INNE",
    "labelPL": "Inne",
    "sort": 11,
    "active": true
  },
  {
    "id": 39,
    "groupId": 4,
    "code": "STAL_KSZTALTOWNIKI",
    "labelPL": "Stal kształtowniki",
    "sort": 1,
    "active": true
  },
  {
    "id": 40,
    "groupId": 4,
    "code": "STAL_BLACHY",
    "labelPL": "Stal blachy",
    "sort": 2,
    "active": true
  },
  {
    "id": 41,
    "groupId": 4,
    "code": "PROFILE_ALU_SYSTEMOWE",
    "labelPL": "Profile alu systemowe",
    "sort": 3,
    "active": true
  },
  {
    "id": 42,
    "groupId": 4,
    "code": "ODKUWKA",
    "labelPL": "Odkuwka",
    "sort": 4,
    "active": true
  },
  {
    "id": 43,
    "groupId": 4,
    "code": "GUMA",
    "labelPL": "Guma",
    "sort": 5,
    "active": true
  },
  {
    "id": 44,
    "groupId": 4,
    "code": "SKLEJKA",
    "labelPL": "Sklejka",
    "sort": 6,
    "active": true
  },
  {
    "id": 45,
    "groupId": 4,
    "code": "TWORZYWA_SZTUCZNE",
    "labelPL": "Tworzywa sztuczne",
    "sort": 7,
    "active": true
  },
  {
    "id": 46,
    "groupId": 4,
    "code": "STAL_FORMATKI",
    "labelPL": "Stal formatki",
    "sort": 8,
    "active": true
  },
  {
    "id": 47,
    "groupId": 4,
    "code": "ALUMINIUM_KSZTALTOWNIKI",
    "labelPL": "Aluminium kształtowniki",
    "sort": 9,
    "active": true
  },
  {
    "id": 48,
    "groupId": 4,
    "code": "ALUMINIUM_BLACHY",
    "labelPL": "Aluminium blachy",
    "sort": 10,
    "active": true
  },
  {
    "id": 49,
    "groupId": 4,
    "code": "PIANKI",
    "labelPL": "Pianki",
    "sort": 11,
    "active": true
  },
  {
    "id": 50,
    "groupId": 5,
    "code": "IMPORT_Z_USA",
    "labelPL": "Import z USA",
    "sort": 1,
    "active": true
  },
  {
    "id": 51,
    "groupId": 5,
    "code": "MCMASTER",
    "labelPL": "McMaster",
    "sort": 2,
    "active": true
  },
  {
    "id": 52,
    "groupId": 5,
    "code": "HANDEL",
    "labelPL": "Handel",
    "sort": 3,
    "active": true
  }
];

export const seedOperations: Operation[] = [
  {
    "id": 1,
    "kindId": 1,
    "code": "OBROBKA_CNC",
    "labelPL": "Obróbka CNC",
    "sort": 1,
    "active": true
  },
  {
    "id": 2,
    "kindId": 1,
    "code": "MODYFIKACJA",
    "labelPL": "Modyfikacja",
    "sort": 2,
    "active": true
  },
  {
    "id": 3,
    "kindId": 1,
    "code": "INNE",
    "labelPL": "Inne",
    "sort": 3,
    "active": true
  },
  {
    "id": 4,
    "kindId": 2,
    "code": "WIRE_EDM_WYCINANIE",
    "labelPL": "Wire EDM Wycinanie",
    "sort": 1,
    "active": true
  },
  {
    "id": 5,
    "kindId": 2,
    "code": "SEDM_DRAZENIE_WGLEBNE",
    "labelPL": "SEDM Drążenie wgłębne",
    "sort": 2,
    "active": true
  },
  {
    "id": 6,
    "kindId": 2,
    "code": "INNE",
    "labelPL": "Inne",
    "sort": 3,
    "active": true
  },
  {
    "id": 7,
    "kindId": 3,
    "code": "OBR_PIANKI",
    "labelPL": "Obr. pianki",
    "sort": 1,
    "active": true
  },
  {
    "id": 8,
    "kindId": 3,
    "code": "OBR_SKLEJKI",
    "labelPL": "Obr. sklejki",
    "sort": 2,
    "active": true
  },
  {
    "id": 9,
    "kindId": 3,
    "code": "OBR_PRZEGRODY",
    "labelPL": "Obr. przegrody",
    "sort": 3,
    "active": true
  },
  {
    "id": 10,
    "kindId": 3,
    "code": "INNE",
    "labelPL": "Inne",
    "sort": 4,
    "active": true
  },
  {
    "id": 11,
    "kindId": 4,
    "code": "ODPUSZCZANIE",
    "labelPL": "Odpuszczanie",
    "sort": 1,
    "active": true
  },
  {
    "id": 12,
    "kindId": 4,
    "code": "HARTOWANIE",
    "labelPL": "Hartowanie",
    "sort": 2,
    "active": true
  },
  {
    "id": 13,
    "kindId": 4,
    "code": "AZOTOWANIE",
    "labelPL": "Azotowanie",
    "sort": 3,
    "active": true
  },
  {
    "id": 14,
    "kindId": 4,
    "code": "NAWEGLANIE",
    "labelPL": "Nawęglanie",
    "sort": 4,
    "active": true
  },
  {
    "id": 15,
    "kindId": 4,
    "code": "HART_INDUKCYJNE",
    "labelPL": "Hart. indukcyjne",
    "sort": 5,
    "active": true
  },
  {
    "id": 16,
    "kindId": 5,
    "code": "MALOWANIE",
    "labelPL": "Malowanie",
    "sort": 1,
    "active": true
  },
  {
    "id": 17,
    "kindId": 5,
    "code": "PIASKOWANIE",
    "labelPL": "Piaskowanie",
    "sort": 2,
    "active": true
  },
  {
    "id": 18,
    "kindId": 5,
    "code": "SRUT_SZKLO",
    "labelPL": "Śrut/szkło",
    "sort": 3,
    "active": true
  },
  {
    "id": 19,
    "kindId": 5,
    "code": "OCYNK",
    "labelPL": "Ocynk",
    "sort": 4,
    "active": true
  },
  {
    "id": 20,
    "kindId": 6,
    "code": "SKAN_3D",
    "labelPL": "Skan 3D",
    "sort": 1,
    "active": true
  },
  {
    "id": 21,
    "kindId": 6,
    "code": "NDT",
    "labelPL": "NDT",
    "sort": 2,
    "active": true
  },
  {
    "id": 22,
    "kindId": 6,
    "code": "POMIAR_CMM",
    "labelPL": "Pomiar CMM",
    "sort": 3,
    "active": true
  },
  {
    "id": 23,
    "kindId": 7,
    "code": "GIECIE_BLACH",
    "labelPL": "Gięcie blach",
    "sort": 1,
    "active": true
  },
  {
    "id": 24,
    "kindId": 7,
    "code": "GIECIE_RUR",
    "labelPL": "Gięcie rur",
    "sort": 2,
    "active": true
  },
  {
    "id": 25,
    "kindId": 7,
    "code": "GIECIE_PROFILI",
    "labelPL": "Gięcie profili",
    "sort": 3,
    "active": true
  },
  {
    "id": 26,
    "kindId": 8,
    "code": "WALCOWANIE_RUR",
    "labelPL": "Walcowanie rur",
    "sort": 1,
    "active": true
  },
  {
    "id": 27,
    "kindId": 8,
    "code": "WALCOWANIE_PROFILI",
    "labelPL": "Walcowanie profili",
    "sort": 2,
    "active": true
  },
  {
    "id": 28,
    "kindId": 9,
    "code": "SPAWANIE_TIG",
    "labelPL": "Spawanie TIG",
    "sort": 1,
    "active": true
  },
  {
    "id": 29,
    "kindId": 9,
    "code": "SPAWANIE_MAG",
    "labelPL": "Spawanie MAG",
    "sort": 2,
    "active": true
  },
  {
    "id": 30,
    "kindId": 10,
    "code": "ZWIJANIE_BLACH",
    "labelPL": "Zwijanie blach",
    "sort": 1,
    "active": true
  },
  {
    "id": 31,
    "kindId": 11,
    "code": "CE",
    "labelPL": "CE",
    "sort": 1,
    "active": true
  },
  {
    "id": 32,
    "kindId": 11,
    "code": "LOAD_TEST",
    "labelPL": "Load test",
    "sort": 2,
    "active": true
  },
  {
    "id": 33,
    "kindId": 11,
    "code": "PRESSURE_TEST",
    "labelPL": "Pressure test",
    "sort": 3,
    "active": true
  },
  {
    "id": 34,
    "kindId": 12,
    "code": "LASER",
    "labelPL": "Laser",
    "sort": 1,
    "active": true
  },
  {
    "id": 35,
    "kindId": 12,
    "code": "WODA",
    "labelPL": "Woda",
    "sort": 2,
    "active": true
  },
  {
    "id": 36,
    "kindId": 12,
    "code": "PLAZMA",
    "labelPL": "Plazma",
    "sort": 3,
    "active": true
  },
  {
    "id": 37,
    "kindId": 13,
    "code": "CIECIE_GIECIE",
    "labelPL": "Cięcie + gięcie",
    "sort": 1,
    "active": true
  },
  {
    "id": 38,
    "kindId": 14,
    "code": "FDM_250MM",
    "labelPL": "FDM 250mm+",
    "sort": 1,
    "active": true
  },
  {
    "id": 39,
    "kindId": 14,
    "code": "SLS",
    "labelPL": "SLS",
    "sort": 2,
    "active": true
  },
  {
    "id": 40,
    "kindId": 14,
    "code": "DRUK_METALEM",
    "labelPL": "Druk metalem",
    "sort": 3,
    "active": true
  },
  {
    "id": 41,
    "kindId": 14,
    "code": "INNE",
    "labelPL": "Inne",
    "sort": 4,
    "active": true
  },
  {
    "id": 42,
    "kindId": 15,
    "code": "GRAWER_LASER",
    "labelPL": "Grawer laser",
    "sort": 1,
    "active": true
  },
  {
    "id": 43,
    "kindId": 15,
    "code": "NADRUK",
    "labelPL": "Nadruk",
    "sort": 2,
    "active": true
  },
  {
    "id": 44,
    "kindId": 15,
    "code": "SITODRUK",
    "labelPL": "Sitodruk",
    "sort": 3,
    "active": true
  },
  {
    "id": 45,
    "kindId": 16,
    "code": "HALAR",
    "labelPL": "Halar",
    "sort": 1,
    "active": true
  },
  {
    "id": 46,
    "kindId": 16,
    "code": "OKSYDOWANIE",
    "labelPL": "Oksydowanie",
    "sort": 2,
    "active": true
  },
  {
    "id": 47,
    "kindId": 16,
    "code": "NYLON",
    "labelPL": "Nylon",
    "sort": 3,
    "active": true
  },
  {
    "id": 48,
    "kindId": 16,
    "code": "ANODOWANIE",
    "labelPL": "Anodowanie",
    "sort": 4,
    "active": true
  },
  {
    "id": 49,
    "kindId": 16,
    "code": "NIKLOWANIE",
    "labelPL": "Niklowanie",
    "sort": 5,
    "active": true
  },
  {
    "id": 50,
    "kindId": 17,
    "code": "NORMATYWA_PL",
    "labelPL": "Normatywa PL",
    "sort": 1,
    "active": true
  },
  {
    "id": 51,
    "kindId": 17,
    "code": "IMPORT_USA",
    "labelPL": "Import USA",
    "sort": 2,
    "active": true
  },
  {
    "id": 52,
    "kindId": 18,
    "code": "POKROWCE",
    "labelPL": "Pokrowce",
    "sort": 1,
    "active": true
  },
  {
    "id": 53,
    "kindId": 19,
    "code": "NAKLEJKI",
    "labelPL": "Naklejki",
    "sort": 1,
    "active": true
  },
  {
    "id": 54,
    "kindId": 22,
    "code": "CIECIE_PRZYG_MAT",
    "labelPL": "Cięcie + przyg. mat.",
    "sort": 1,
    "active": true
  },
  {
    "id": 55,
    "kindId": 22,
    "code": "SPAWANIE",
    "labelPL": "Spawanie",
    "sort": 2,
    "active": true
  },
  {
    "id": 56,
    "kindId": 22,
    "code": "PASYWACJA_SPOIN",
    "labelPL": "Pasywacja spoin",
    "sort": 3,
    "active": true
  },
  {
    "id": 57,
    "kindId": 22,
    "code": "SZLIFOWANIE",
    "labelPL": "Szlifowanie",
    "sort": 4,
    "active": true
  },
  {
    "id": 58,
    "kindId": 22,
    "code": "PROSTOWANIE",
    "labelPL": "Prostowanie",
    "sort": 5,
    "active": true
  },
  {
    "id": 59,
    "kindId": 23,
    "code": "MONTAZ",
    "labelPL": "Montaż",
    "sort": 1,
    "active": true
  },
  {
    "id": 60,
    "kindId": 23,
    "code": "NAPRAWA",
    "labelPL": "Naprawa",
    "sort": 2,
    "active": true
  },
  {
    "id": 61,
    "kindId": 24,
    "code": "DRUK_3D",
    "labelPL": "Druk 3D",
    "sort": 1,
    "active": true
  },
  {
    "id": 62,
    "kindId": 25,
    "code": "TRANSPORT_WEW",
    "labelPL": "Transport wew.",
    "sort": 1,
    "active": true
  },
  {
    "id": 63,
    "kindId": 25,
    "code": "TRANSPORT_ZLECONY",
    "labelPL": "Transport zlecony",
    "sort": 2,
    "active": true
  },
  {
    "id": 64,
    "kindId": 26,
    "code": "PROJEKTOWANIE_2D_3D",
    "labelPL": "Projektowanie 2D 3D",
    "sort": 1,
    "active": true
  },
  {
    "id": 65,
    "kindId": 26,
    "code": "INSTRUKCJE_OBSLUGI",
    "labelPL": "Instrukcje obsługi",
    "sort": 2,
    "active": true
  },
  {
    "id": 66,
    "kindId": 26,
    "code": "STEP_DXF",
    "labelPL": "STEP/DXF",
    "sort": 3,
    "active": true
  },
  {
    "id": 67,
    "kindId": 27,
    "code": "KJ_MIEDZYOPERACYJNA",
    "labelPL": "KJ międzyoperacyjna",
    "sort": 1,
    "active": true
  },
  {
    "id": 68,
    "kindId": 27,
    "code": "KJ_KONCOWA",
    "labelPL": "KJ końcowa",
    "sort": 2,
    "active": true
  }
];

export const seedComponentKindSuppliers: ComponentKindSupplier[] = [
  {
    "id": 1,
    "kindId": 28,
    "supplierId": 1,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 2,
    "kindId": 28,
    "supplierId": 2,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 3,
    "kindId": 28,
    "supplierId": 3,
    "isDefault": false,
    "sort": 3
  },
  {
    "id": 4,
    "kindId": 29,
    "supplierId": 4,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 5,
    "kindId": 30,
    "supplierId": 5,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 6,
    "kindId": 31,
    "supplierId": 6,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 7,
    "kindId": 32,
    "supplierId": 7,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 8,
    "kindId": 33,
    "supplierId": 8,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 9,
    "kindId": 34,
    "supplierId": 8,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 10,
    "kindId": 35,
    "supplierId": 9,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 11,
    "kindId": 35,
    "supplierId": 10,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 12,
    "kindId": 35,
    "supplierId": 11,
    "isDefault": false,
    "sort": 3
  },
  {
    "id": 13,
    "kindId": 36,
    "supplierId": 12,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 14,
    "kindId": 36,
    "supplierId": 13,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 15,
    "kindId": 37,
    "supplierId": 14,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 16,
    "kindId": 39,
    "supplierId": 15,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 17,
    "kindId": 39,
    "supplierId": 16,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 18,
    "kindId": 39,
    "supplierId": 17,
    "isDefault": false,
    "sort": 3
  },
  {
    "id": 19,
    "kindId": 40,
    "supplierId": 15,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 20,
    "kindId": 40,
    "supplierId": 16,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 21,
    "kindId": 40,
    "supplierId": 17,
    "isDefault": false,
    "sort": 3
  },
  {
    "id": 22,
    "kindId": 41,
    "supplierId": 18,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 23,
    "kindId": 43,
    "supplierId": 19,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 24,
    "kindId": 44,
    "supplierId": 20,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 25,
    "kindId": 45,
    "supplierId": 21,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 26,
    "kindId": 45,
    "supplierId": 22,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 27,
    "kindId": 45,
    "supplierId": 23,
    "isDefault": false,
    "sort": 3
  },
  {
    "id": 28,
    "kindId": 46,
    "supplierId": 24,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 29,
    "kindId": 46,
    "supplierId": 25,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 30,
    "kindId": 47,
    "supplierId": 26,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 31,
    "kindId": 47,
    "supplierId": 27,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 32,
    "kindId": 48,
    "supplierId": 26,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 33,
    "kindId": 48,
    "supplierId": 27,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 34,
    "kindId": 49,
    "supplierId": 28,
    "isDefault": true,
    "sort": 1
  },
  {
    "id": 35,
    "kindId": 49,
    "supplierId": 29,
    "isDefault": false,
    "sort": 2
  },
  {
    "id": 36,
    "kindId": 50,
    "supplierId": 5,
    "isDefault": true,
    "sort": 1
  }
];

// LOOKUP (comment):
// {"KOOPERACJA/Obróbka CNC":{"groupId":1,"kindId":1},"KOOPERACJA/Obróbka EDM":{"groupId":1,"kindId":2},"KOOPERACJA/Obróbka ploter":{"groupId":1,"kindId":3},"KOOPERACJA/Obróbka cieplna":{"groupId":1,"kindId":4},"KOOPERACJA/Obróbka powierzchni":{"groupId":1,"kindId":5},"KOOPERACJA/Badania":{"groupId":1,"kindId":6},"KOOPERACJA/Gięcie":{"groupId":1,"kindId":7},"KOOPERACJA/Walcowanie":{"groupId":1,"kindId":8},"KOOPERACJA/Spawanie":{"groupId":1,"kindId":9},"KOOPERACJA/Zwijanie":{"groupId":1,"kindId":10},"KOOPERACJA/Certyfikacja":{"groupId":1,"kindId":11},"KOOPERACJA/Cięcie":{"groupId":1,"kindId":12},"KOOPERACJA/Cięcie + gięcie":{"groupId":1,"kindId":13},"KOOPERACJA/Druk 3D zew.":{"groupId":1,"kindId":14},"KOOPERACJA/Znakowanie":{"groupId":1,"kindId":15},"KOOPERACJA/Powłoki":{"groupId":1,"kindId":16},"KOOPERACJA/Komponenty handlowe":{"groupId":1,"kindId":17},"KOOPERACJA/Pokrowce":{"groupId":1,"kindId":18},"KOOPERACJA/Naklejki":{"groupId":1,"kindId":19},"KOOPERACJA/Transport":{"groupId":1,"kindId":20},"KOOPERACJA/Inne":{"groupId":1,"kindId":21},"WEWNETRZNE/Spawanie":{"groupId":2,"kindId":22},"WEWNETRZNE/Montaż":{"groupId":2,"kindId":23},"WEWNETRZNE/Druk 3D wew.":{"groupId":2,"kindId":24},"WEWNETRZNE/Transport":{"groupId":2,"kindId":25},"WEWNETRZNE/Projektowanie":{"groupId":2,"kindId":26},"WEWNETRZNE/Kontrola jakości":{"groupId":2,"kindId":27},"NORMATYWA/Komponenty handlowe met.":{"groupId":3,"kindId":28},"NORMATYWA/Komponenty handlowe cal.":{"groupId":3,"kindId":29},"NORMATYWA/Import USA":{"groupId":3,"kindId":30},"NORMATYWA/McMaster":{"groupId":3,"kindId":31},"NORMATYWA/Elesa Ganter":{"groupId":3,"kindId":32},"NORMATYWA/KIPP":{"groupId":3,"kindId":33},"NORMATYWA/Norelem":{"groupId":3,"kindId":34},"NORMATYWA/Zawiesia":{"groupId":3,"kindId":35},"NORMATYWA/Koła":{"groupId":3,"kindId":36},"NORMATYWA/Sprężyny":{"groupId":3,"kindId":37},"NORMATYWA/Inne":{"groupId":3,"kindId":38},"MATERIALY_PRODUKCYJNE/Stal kształtowniki":{"groupId":4,"kindId":39},"MATERIALY_PRODUKCYJNE/Stal blachy":{"groupId":4,"kindId":40},"MATERIALY_PRODUKCYJNE/Profile alu systemowe":{"groupId":4,"kindId":41},"MATERIALY_PRODUKCYJNE/Odkuwka":{"groupId":4,"kindId":42},"MATERIALY_PRODUKCYJNE/Guma":{"groupId":4,"kindId":43},"MATERIALY_PRODUKCYJNE/Sklejka":{"groupId":4,"kindId":44},"MATERIALY_PRODUKCYJNE/Tworzywa sztuczne":{"groupId":4,"kindId":45},"MATERIALY_PRODUKCYJNE/Stal formatki":{"groupId":4,"kindId":46},"MATERIALY_PRODUKCYJNE/Aluminium kształtowniki":{"groupId":4,"kindId":47},"MATERIALY_PRODUKCYJNE/Aluminium blachy":{"groupId":4,"kindId":48},"MATERIALY_PRODUKCYJNE/Pianki":{"groupId":4,"kindId":49},"AEROPARTS/Import z USA":{"groupId":5,"kindId":50},"AEROPARTS/McMaster":{"groupId":5,"kindId":51},"AEROPARTS/Handel":{"groupId":5,"kindId":52}}
