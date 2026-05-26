INSERT INTO public.stocks (symbol, company_name, exchange, sector)
SELECT * FROM (VALUES
  ('RELIANCE.NS', 'Reliance Industries Ltd.', 'NSE', 'Energy'),
  ('TCS.NS',       'Tata Consultancy Services',     'NSE', 'IT'),
  ('HDFCBANK.NS',  'HDFC Bank Ltd.',                 'NSE', 'Finance'),
  ('ICICIBANK.NS', 'ICICI Bank Ltd.',                 'NSE', 'Finance'),
  ('INFY.NS',      'Infosys Ltd.',                    'NSE', 'IT'),
  ('SBIN.NS',      'State Bank of India',             'NSE', 'Finance'),
  ('BHARTIARTL.NS','Bharti Airtel Ltd.',              'NSE', 'Telecom'),
  ('ITC.NS',       'ITC Ltd.',                        'NSE', 'Consumer Goods'),
  ('WIPRO.NS',     'Wipro Ltd.',                      'NSE', 'IT'),
  ('LT.NS',        'Larsen & Toubro Ltd.',            'NSE', 'Construction')
) AS v(symbol, company_name, exchange, sector)
WHERE NOT EXISTS (SELECT 1 FROM public.stocks WHERE symbol = v.symbol);
