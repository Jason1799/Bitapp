export interface ListingAgreementData {
    company: string;
    jurisdiction: string;
    address: string;
    listingdate: string;
    amount: string;
    amountInWords: string;
    token: string;
    signdate: string;
    signname: string;
    marketingamount: string;
    marketinginwords: string;
    tradingpair: string;
    wallets: string; // Single text block for wallets
    includeTechnicalFee: boolean; // Retain for logic control
}

export interface KYCData {
    account_id: string;
    name: string;
    country: string;
    gender: string;
    id_expired: string;
    id_expiry: string;
    id_type: string;
    id_number: string;
    dob: string;
    submit_time: string;
    review_time: string;
    submit_ip: string;
    ip_location: string;
    device_id: string;
    device_type: string;
    channel: string;
    files: File[];
}
