import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic';

const ALL_SCRAPES = [
  'most_actives', 'day_gainers', 'day_losers', 'undervalued_growth_stocks',
  'undervalued_large_caps', 'aggressive_small_caps', 'growth_technology_stocks',
  'most_shorted_stocks', 'portfolio_anchors', 'small_cap_gainers',
  'solid_large_growth_funds', 'solid_midcap_growth_funds',
  'conservative_foreign_funds', 'high_yield_bond', 'top_mutual_funds',
] as const;

const SEARCH_TERMS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  'India', 'Limited', 'Ltd', 'Bank', 'Technologies', 'Services',
  'Pharma', 'Chemicals', 'Steel', 'Auto', 'Energy', 'Power',
  'Finance', 'Insurance', 'Hospital', 'Healthcare', 'Food',
  'Consumer', 'Media', 'Entertainment', 'Infrastructure',
  'Engineering', 'Construction', 'Textiles', 'Mining', 'Metals',
  'Telecom', 'Software', 'Electronics', 'Logistics', 'Shipping',
  'Aviation', 'Defence', 'Hotels', 'Retail', 'Realty',
];

const INDIAN_SUFFIXES = ['.NS', '.BO'];

function isIndianSymbol(symbol: string): boolean {
  return INDIAN_SUFFIXES.some((s) => symbol.endsWith(s));
}

function getExchangeFromSymbol(symbol: string): string {
  return symbol.endsWith('.BO') ? 'BSE' : 'NSE';
}

async function discoverViaSearch(): Promise<Set<string>> {
  const discovered = new Set<string>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < SEARCH_TERMS.length; i += BATCH_SIZE) {
    const batch = SEARCH_TERMS.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((term) =>
        yahooFinance.search(term, { region: 'IN', quotesCount: 20 })
      )
    );
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      for (const q of s.value.quotes) {
        if ('symbol' in q && typeof q.symbol === 'string' && isIndianSymbol(q.symbol)) {
          discovered.add(q.symbol);
        }
      }
    }
  }
  return discovered;
}

async function discoverViaScreener(): Promise<Set<string>> {
  const discovered = new Set<string>();

  for (let i = 0; i < ALL_SCRAPES.length; i += 5) {
    const batch = ALL_SCRAPES.slice(i, i + 5);
    const settled = await Promise.allSettled(
      batch.map((scrId) =>
        yahooFinance.screener({ scrIds: scrId as any, count: 250 })
      )
    );
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      for (const q of s.value.quotes) {
        if (isIndianSymbol(q.symbol)) {
          discovered.add(q.symbol);
        }
      }
      const total = s.value.total;
      if (total > 250) {
        const extraPages = Math.min(Math.ceil((total - 250) / 250), 1);
        for (let p = 0; p < extraPages; p++) {
          try {
            const pageResult = await yahooFinance.screener({
              scrIds: batch[settled.indexOf(s)] as any,
              count: 250,
              start: 250 + p * 250,
            });
            for (const q of pageResult.quotes) {
              if (isIndianSymbol(q.symbol)) {
                discovered.add(q.symbol);
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  }
  return discovered;
}

const FALLBACK_SYMBOLS = [
  // NIFTY 50
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
  'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'WIPRO.NS', 'LT.NS',
  'HINDUNILVR.NS', 'NTPC.NS', 'ONGC.NS', 'POWERGRID.NS', 'TITAN.NS',
  'BAJFINANCE.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TATAMOTORS.NS', 'AXISBANK.NS',
  'KOTAKBANK.NS', 'ULTRACEMCO.NS', 'ASIANPAINT.NS', 'NESTLEIND.NS', 'M&M.NS',
  'JSWSTEEL.NS', 'TATASTEEL.NS', 'COALINDIA.NS', 'BPCL.NS', 'GRASIM.NS',
  'ADANIPORTS.NS', 'HCLTECH.NS', 'TECHM.NS', 'INDUSINDBK.NS', 'BAJAJFINSV.NS',
  'TRENT.NS', 'DLF.NS', 'PIDILITIND.NS', 'HINDALCO.NS', 'EICHERMOT.NS',
  'BRITANNIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS', 'CIPLA.NS', 'APOLLOHOSP.NS',
  'SBILIFE.NS', 'ICICIPRULI.NS', 'HDFCLIFE.NS', 'MARICO.NS', 'DABUR.NS',
  // NIFTY Next 50
  'VEDL.NS', 'HAL.NS', 'BEL.NS', 'IOC.NS', 'GAIL.NS',
  'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'TVSMOTOR.NS', 'PAGEIND.NS', 'SRTRANSFIN.NS',
  'MCDOWELL-N.NS', 'COLPAL.NS', 'GODREJCP.NS', 'HAVELLS.NS', 'AMBUJACEM.NS',
  'ACC.NS', 'SHREECEM.NS', 'SIEMENS.NS', 'BHEL.NS', 'DMART.NS',
  'ZOMATO.NS', 'PAYTM.NS', 'NYKAA.NS', 'ICICIGI.NS', 'LICI.NS',
  'IRCTC.NS', 'BANDHANBNK.NS', 'PNB.NS', 'BANKBARODA.NS', 'CANBK.NS',
  'IDFCFIRSTB.NS', 'AUBANK.NS', 'INDIAMART.NS', 'PERSISTENT.NS', 'LTTS.NS',
  'LUPIN.NS', 'TORNTPHARM.NS', 'AUROPHARMA.NS', 'BIOCON.NS', 'ALKEM.NS',
  'BERGEPAINT.NS', 'FEDERALBNK.NS', 'RBLBANK.NS', 'VOLTAS.NS', 'ABB.NS',
  'POLYCAB.NS', 'AARTIIND.NS', 'MUTHOOTFIN.NS', 'PEL.NS', 'MFSL.NS',
  // NIFTY Midcap 150
  '3MINDIA.NS', 'AAVAS.NS', 'ABFRL.NS', 'ABSLAMC.NS', 'ACCELYA.NS',
  'ADANIGREEN.NS', 'ADANIPOWER.NS', 'ADANITRANS.NS', 'AHLUCONT.NS', 'AIAENG.NS',
  'AJANTPHARM.NS', 'ALEMBICLTD.NS', 'ALOKINDS.NS', 'AMBER.NS', 'AMIORG.NS',
  'AMRUTANJAN.NS', 'ANANDRATHI.NS', 'ANGELONE.NS', 'ANUP.NS', 'APARINDS.NS',
  'APLAPOLLO.NS', 'APTUS.NS', 'ARVIND.NS', 'ASAHIINDIA.NS', 'ASHOKA.NS',
  'ASTERDM.NS', 'ASTRAZEN.NS', 'ATUL.NS', 'AUTOAXLES.NS', 'AVANTIFEED.NS',
  'BALAMINES.NS', 'BALKRISIND.NS', 'BALRAMCHIN.NS', 'BANCOINDIA.NS', 'BASF.NS',
  'BAYERCROP.NS', 'BEML.NS', 'BHARATFORG.NS', 'BIGBLOC.NS', 'BLUEDART.NS',
  'BOMDYEING.NS', 'BORORENEW.NS', 'BRIGADE.NS', 'BSE.NS', 'CALSOFT.NS',
  'CAPLIPOINT.NS', 'CARBORUNIV.NS', 'CASTROLIND.NS', 'CCL.NS', 'CEATLTD.NS',
  'CENTRALBK.NS', 'CENTURYPLY.NS', 'CESC.NS', 'CGPOWER.NS', 'CHALET.NS',
  'CHAMBLFERT.NS', 'CHEMPLASTS.NS', 'CHOLAHLDNG.NS', 'CLEAN.NS', 'COCHINSHIP.NS',
  'COMPINFO.NS', 'CONCORDBIO.NS', 'COROMANDEL.NS', 'CREDITACC.NS', 'CRISIL.NS',
  'CROMPTON.NS', 'CSBBANK.NS', 'CYIENT.NS', 'DCMSHRIRAM.NS', 'DEEPAKFERT.NS',
  'DEEPAKNTR.NS', 'DELTACORP.NS', 'DEVYANI.NS', 'DHANUKA.NS', 'DHFL.NS',
  'DIAMONDYD.NS', 'DISHTV.NS', 'DIXON.NS', 'DLINKINDIA.NS', 'DPABHUSHAN.NS',
  'DSSL.NS', 'DYCL.NS', 'EDELWEISS.NS', 'EIDPARRY.NS', 'ELGIEQUIP.NS',
  'EMAMILTD.NS', 'ENDURANCE.NS', 'ENGINERSIN.NS', 'ENTERO.NS', 'EQUITASBNK.NS',
  'ERIS.NS', 'ESCORTS.NS', 'ESABINDIA.NS', 'EVEREADY.NS', 'EXIDEIND.NS',
  'FDC.NS', 'FIEMIND.NS', 'FINPIPE.NS', 'FIVESTAR.NS', 'FLUOROCHEM.NS',
  'FMGOETZE.NS', 'FORTIS.NS', 'FRETAIL.NS', 'FSL.NS', 'GALLANTT.NS',
  'GANDHAR.NS', 'GARFIBRES.NS', 'GATI.NS', 'GICRE.NS', 'GILLETTE.NS',
  'GLENMARK.NS', 'GMMPFAUDLR.NS', 'GMRINFRA.NS', 'GODREJAGRO.NS', 'GODREJIND.NS',
  'GODREJPROP.NS', 'GOODRICKE.NS', 'GPPL.NS', 'GRANULES.NS', 'GRAPHITE.NS',
  'GREAVESCOT.NS', 'GREENPANEL.NS', 'GRINDWELL.NS', 'GSFC.NS', 'GSPL.NS',
  'GUJALKALI.NS', 'GUJFLUORO.NS', 'GUJGASLTD.NS', 'HATSUN.NS', 'HBLPOWER.NS',
  'HCC.NS', 'HCL-INSYS.NS', 'HCP.NS', 'HEIDELBERG.NS', 'HEMIPROP.NS',
  'HFCL.NS', 'HGS.NS', 'HIKAL.NS', 'HINDCOMPOS.NS', 'HINDPETRO.NS',
  'HINDZINC.NS', 'HITECH.NS', 'HMVL.NS', 'HONDAPOWER.NS', 'HOTELEELA.NS',
  'HRHNEXT.NS', 'HSIL.NS', 'HUDCO.NS', 'IBREALEST.NS', 'IBULHSGFIN.NS',
  'ICIL.NS', 'IDBI.NS', 'IDFC.NS', 'IFBIND.NS', 'IFCI.NS',
  'IGL.NS', 'IIFL.NS', 'IIFLSEC.NS', 'IMAGICAA.NS', 'INDIACEM.NS',
  'INDIANB.NS', 'INDIGO.NS', 'INDOSTAR.NS', 'INDOTECH.NS', 'INDUSFIL.NS',
  'INDUSTOWER.NS', 'INFIBEAM.NS', 'INGERRAND.NS', 'INOXGREEN.NS', 'INOXLEISUR.NS',
  'INTELLECT.NS', 'IPCALAB.NS', 'IRB.NS', 'IRCON.NS', 'ISGEC.NS',
  'ITI.NS', 'J&KBANK.NS', 'JAGRAN.NS', 'JAICORPLTD.NS', 'JAMNAAUTO.NS',
  'JBCHEPHARM.NS', 'JBMA.NS', 'JCHAC.NS', 'JINDALSAW.NS', 'JINDALSTEL.NS',
  'JKCEMENT.NS', 'JKLAKSHMI.NS', 'JKPAPER.NS', 'JKTYRE.NS', 'JMFINANCIL.NS',
  'JSL.NS', 'JUBLFOOD.NS', 'JUBLINGREA.NS', 'JUBLPHARMA.NS', 'JUSTDIAL.NS',
  'JYOTHYLAB.NS', 'KAJARIACER.NS', 'KALPATPOWR.NS', 'KANSAINER.NS', 'KARURVYSYA.NS',
  'KEI.NS', 'KERNEX.NS', 'KHADIM.NS', 'KHAITANLTD.NS', 'KHANDSE.NS',
  'KIRLOSBROS.NS', 'KIRLOSENG.NS', 'KNR.NS', 'KNRCON.NS', 'KOKUYOCMLN.NS',
  'KOLTEPATIL.NS', 'KPRMILL.NS', 'KRBL.NS', 'KSB.NS', 'KSERASERA.NS',
  'KTKBANK.NS', 'KUANTUM.NS', 'LAURUSLABS.NS', 'LAXMIEMB.NS', 'LCCINFOTEC.NS',
  'LEMONTREE.NS', 'LGBBROSLTD.NS', 'LGBFORGE.NS', 'LIBAS.NS', 'LICHSGFIN.NS',
  'LINCOLN.NS', 'LINDEINDIA.NS', 'LIQUID.NS', 'LOKESHMACH.NS', 'LOWVOL.NS',
  'LOVABLE.NS', 'LPDC.NS', 'LSIL.NS', 'M&B.NS', 'M&MFIN.NS',
  'MAANALU.NS', 'MAGMA.NS', 'MAHABANK.NS', 'MAHESHWARI.NS', 'MAHLIFE.NS',
  'MAHLOG.NS', 'MAHSCOOTER.NS', 'MAHSEAMLES.NS', 'MAITHANALL.NS', 'MAJESCO.NS',
  'MAKARPL.NS', 'MALLCOM.NS', 'MANAKSIA.NS', 'MANALIPVC.NS', 'MANAPPURAM.NS',
  'MANGALAM.NS', 'MANGCHEFER.NS', 'MANGLURSE.NS', 'MANPASAND.NS', 'MANUGRAPH.NS',
  'MARALOVER.NS', 'MARATHON.NS', 'MARKSANS.NS', 'MASFIN.NS', 'MASPACK.NS',
  'MASTEK.NS', 'MATRIMONY.NS', 'MAWANA.NS', 'MAXHEALTH.NS', 'MAXIND.NS',
  'MAYURUNIQ.NS', 'MAZDA.NS', 'MBAPL.NS', 'MBLINFRA.NS', 'MCDHOLDING.NS',
  'MCL.NS', 'MCLEODRUSS.NS', 'MCNALLY.NS', 'MCX.NS', 'MEGASOFT.NS',
  'MELSTAR.NS', 'MENONBE.NS', 'MEP.NS', 'MERCATOR.NS', 'METALFORGE.NS',
  'METROPOLIS.NS', 'MFL.NS', 'MFSL.NS', 'MGEL.NS', 'MGL.NS',
  'MHHL.NS', 'MHLXMIRU.NS', 'MHRIL.NS', 'MIC.NS', 'MIDHANI.NS',
  'MILTON.NS', 'MINDA.NS', 'MINDTECK.NS', 'MIRCELECTR.NS', 'MIRZAINT.NS',
  'MMFL.NS', 'MMTC.NS', 'MODIRUBBER.NS', 'MOHITIND.NS', 'MOHOTA.NS',
  'MOIL.NS', 'MOLDTECH.NS', 'MOLDTKPAC.NS', 'MONSANTO.NS', 'MORARJEE.NS',
  'MOREPENLAB.NS', 'MOTHERSUMI.NS', 'MOTILALOFS.NS', 'MOTOGENFIN.NS', 'MPHASIS.NS',
  'MRF.NS', 'MRO.NS', 'MSPL.NS', 'MTEDUCARE.NS', 'MTNL.NS',
  'MUKANDLTD.NS', 'MUKTAARTS.NS', 'MUNJALAU.NS', 'MUNJALSHOW.NS', 'MURUDCERA.NS',
  'MVG.NS', 'MWL.NS', 'NAHARCAP.NS', 'NAHARINDUS.NS', 'NAHARPOLY.NS',
  'NATCOPHARM.NS', 'NATIONALUM.NS', 'NAUKRI.NS', 'NAVINFLUOR.NS', 'NAVKARCORP.NS',
  'NAVNETEDUL.NS', 'NBCC.NS', 'NBIFIN.NS', 'NCC.NS', 'NCLIND.NS',
  'NDTV.NS', 'NECCLTD.NS', 'NELCAST.NS', 'NELCO.NS', 'NEOGEN.NS',
  'NESCO.NS', 'NESTLEIND.NS', 'NETWORK18.NS', 'NEULANDLAB.NS', 'NEWGEN.NS',
  'NEXTMEDIA.NS', 'NFL.NS', 'NH.NS', 'NHPC.NS', 'NIACL.NS',
  'NIBL.NS', 'NIITLTD.NS', 'NILAINFRA.NS', 'NILKAMAL.NS', 'NIPPOBATRY.NS',
  'NITINSPIN.NS', 'NKIND.NS', 'NLCINDIA.NS', 'NMDC.NS', 'NOCIL.NS',
  'NOIDATOLL.NS', 'NORBTEA.NS', 'NRAIL.NS', 'NRBBEARING.NS', 'NSIL.NS',
  'NTL.NS', 'NUCLEUS.NS', 'NXTDIGITAL.NS', 'NYT.NS', 'OAL.NS',
  'OBEROIRLTY.NS', 'OCCL.NS', 'OFSS.NS', 'OIL.NS', 'OMAXAUTO.NS',
  'OMAXE.NS', 'OMKARCHEM.NS', 'ONELIFECAP.NS', 'ONEPOINT.NS', 'ONWARDTEC.NS',
  'OPTIEMUS.NS', 'ORIENTABRA.NS', 'ORIENTALTL.NS', 'ORIENTBELL.NS', 'ORIENTCEM.NS',
  'ORIENTELEC.NS', 'ORIENTHOT.NS', 'ORIENTLTD.NS', 'ORIENTPPR.NS', 'ORIENTREF.NS',
  'ORISSAMINE.NS', 'OROSILVER.NS', 'OSWALAGRO.NS', 'OSWALGREEN.NS', 'PACE.NS',
  'PACIFIC.NS', 'PAGEIND.NS', 'PAISALO.NS', 'PALASHSEC.NS', 'PALREDTEC.NS',
  'PANACEABIO.NS', 'PANACHE.NS', 'PANAMAPET.NS', 'PANSARI.NS', 'PAR.NS',
  'PARACABLES.NS', 'PARADEEP.NS', 'PARAGMILK.NS', 'PARAS.NS', 'PARKHOTELS.NS',
  'PARNAXLAB.NS', 'PARSHWANATH.NS', 'PASUPTAC.NS', 'PATANJALI.NS', 'PATELENG.NS',
  'PATINTLOG.NS', 'PATSPINLTD.NS', 'PCJEWELLER.NS', 'PDMJEPAPER.NS', 'PDSL.NS',
  'PEARLPOLY.NS', 'PEL.NS', 'PENIND.NS', 'PENINLAND.NS', 'PERSISTENT.NS',
  'PETRONET.NS', 'PFC.NS', 'PFIZER.NS', 'PFOCUS.NS', 'PHANTOMFX.NS',
  'PHILIPCARB.NS', 'PHOENIXLTD.NS', 'PIDILITIND.NS', 'PIIND.NS', 'PILANIINVS.NS',
  'PILITA.NS', 'PIONEEREMB.NS', 'PIPAVAVDOC.NS', 'PITTIENG.NS', 'PLASTIBLEN.NS',
  'PNBGILTS.NS', 'PNBHOUSING.NS', 'PNC.NS', 'PODDAR.NS', 'PODDARMENT.NS',
  'POKARNA.NS', 'POLYCAB.NS', 'POLYMED.NS', 'POLYPLEX.NS', 'PONNIERODE.NS',
  'POONAWALLA.NS', 'POWERINDIA.NS', 'POWERMECH.NS', 'PPAP.NS', 'PRADEEP.NS',
  'PRAENG.NS', 'PRAJIND.NS', 'PRAKASH.NS', 'PRECAM.NS', 'PRECOT.NS',
  'PRECWIRE.NS', 'PREMEXPLN.NS', 'PREMIER.NS', 'PREMIERPOL.NS', 'PRESSMN.NS',
  'PRESTIGE.NS', 'PRICOLLTD.NS', 'PRIMESECU.NS', 'PRINCEPIPE.NS', 'PRITI.NS',
  'PRITIKAUTO.NS', 'PRIVISCL.NS', 'PROZONINTU.NS', 'PRSMJOHNSN.NS', 'PSB.NS',
  'PSL.NS', 'PSPPROJECT.NS', 'PSTL.NS', 'PTC.NS', 'PTL.NS',
  'PUNJABCHEM.NS', 'PURVA.NS', 'PVP.NS', 'PVRINOX.NS', 'QGO.NS',
  'QUESS.NS', 'QUICKHEAL.NS', 'RADAAN.NS', 'RADHIKAJWE.NS', 'RADICO.NS',
  'RADIOCITY.NS', 'RAIN.NS', 'RAJESHEXPO.NS', 'RAJMET.NS', 'RAJRATAN.NS',
  'RAJSREESUG.NS', 'RAJTV.NS', 'RALLIS.NS', 'RAMANEWS.NS', 'RAMASTEEL.NS',
  'RAMCOCEM.NS', 'RAMCOIND.NS', 'RAMCOSYS.NS', 'RAMKY.NS', 'RAMRAT.NS',
  'RANASUG.NS', 'RANEENG.NS', 'RATEGAIN.NS', 'RATNAMANI.NS', 'RAYMOND.NS',
  'RBL.NS', 'RCF.NS', 'RECLTD.NS', 'REDINGTON.NS', 'REFEX.NS',
  'REGENCERAM.NS', 'RELAXO.NS', 'RELIANCE.NS', 'RELIGARE.NS', 'RELINFRA.NS',
  'REMSONSIND.NS', 'RENUKA.NS', 'REPCOHOME.NS', 'REPL.NS', 'RESPONIND.NS',
  'REVATHI.NS', 'RGL.NS', 'RHFL.NS', 'RHL.NS', 'RICOAUTO.NS',
  'RIIL.NS', 'RITES.NS', 'RKDL.NS', 'RKFORGE.NS', 'RML.NS',
  'RNAM.NS', 'ROHITFERRO.NS', 'ROHLTD.NS', 'ROLTA.NS', 'ROML.NS',
  'ROSSARI.NS', 'ROSSELLIND.NS', 'ROUTE.NS', 'RPGLIFE.NS', 'RPPINFRA.NS',
  'RPPL.NS', 'RSSOFTWARE.NS', 'RSWM.NS', 'RSYSTEMS.NS', 'RTNPOWER.NS',
  'RUBYMILLS.NS', 'RUCHI.NS', 'RUCHINFRA.NS', 'RUCHIRA.NS', 'RUSTOMJEE.NS',
  'RVHL.NS', 'RVNL.NS', 'S&SPOWER.NS', 'SABTN.NS', 'SADBHIN.NS',
  'SADHNANIQ.NS', 'SAFARI.NS', 'SAGARDEEP.NS', 'SAGCEM.NS', 'SAH.NS',
  'SAIL.NS', 'SAKAR.NS', 'SAKHTISUG.NS', 'SAKSOFT.NS', 'SAKUMA.NS',
  'SALASAR.NS', 'SALONA.NS', 'SALSTEEL.NS', 'SALZERELEC.NS', 'SAMBHAAV.NS',
  'SAMHI.NS', 'SAMPANN.NS', 'SANCO.NS', 'SANDESH.NS', 'SANDHAR.NS',
  'SANGAMIND.NS', 'SANGHIIND.NS', 'SANGHVIMOV.NS', 'SANGINITA.NS', 'SANOFI.NS',
  'SANSERA.NS', 'SAPPHIRE.NS', 'SARDAEN.NS', 'SAREGAMA.NS', 'SARLAPOLY.NS',
  'SARVESHWAR.NS', 'SASKEN.NS', 'SASTYSUIT.NS', 'SATIA.NS', 'SATIN.NS',
  'SBC.NS', 'SBI.NS', 'SBICARD.NS', 'SBILIFE.NS', 'SBIN.NS',
  'SCAPDVR.NS', 'SCHAEFFLER.NS', 'SCHAND.NS', 'SCHNEIDER.NS', 'SCI.NS',
  'SDBL.NS', 'SEAMECLTD.NS', 'SECURKLOUD.NS', 'SEJALLTD.NS', 'SELAN.NS',
  'SELMC.NS', 'SEMAC.NS', 'SENCO.NS', 'SEPC.NS', 'SEQUENT.NS',
  'SERVOTECH.NS', 'SESHAPAPER.NS', 'SETCO.NS', 'SETUINFRA.NS', 'SEYAIND.NS',
  'SFL.NS', 'SGIL.NS', 'SGL.NS', 'SHAHALLOYS.NS', 'SHAILY.NS',
  'SHAKTIPUMP.NS', 'SHALBY.NS', 'SHALPAINTS.NS', 'SHANKARA.NS', 'SHANTI.NS',
  'SHANTIGEAR.NS', 'SHARDACROP.NS', 'SHARDAMOTR.NS', 'SHAREINDIA.NS', 'SHEMAROO.NS',
  'SHIGAN.NS', 'SHIL.NS', 'SHILPAMED.NS', 'SHIVAMILLS.NS', 'SHIVAUM.NS',
  'SHIVATEX.NS', 'SHK.NS', 'SHOPERSTOP.NS', 'SHRADHA.NS', 'SHREDIGCEM.NS',
  'SHREECEM.NS', 'SHREEPUSHK.NS', 'SHREERAMA.NS', 'SHRENIK.NS', 'SHREYANIND.NS',
  'SHREYAS.NS', 'SHRIPISTON.NS', 'SHRIRAMCIT.NS', 'SHRIRAMPPS.NS', 'SHUBHRA.NS',
  'SHYAMCENT.NS', 'SHYAMMETL.NS', 'SICAGEN.NS', 'SICAL.NS', 'SIEMENS.NS',
  'SIGACHI.NS', 'SIGIND.NS', 'SIGNATURE.NS', 'SIL.NS', 'SILGO.NS',
  'SILINV.NS', 'SILLYMONKS.NS', 'SILVERTUC.NS', 'SIMBHALS.NS', 'SIMPLEXINF.NS',
  'SINTERCOM.NS', 'SINTEX.NS', 'SIRCA.NS', 'SIS.NS', 'SITINET.NS',
  'SIYSIL.NS', 'SJVN.NS', 'SKFINDIA.NS', 'SKIPPER.NS', 'SKMEGGPROD.NS',
  'SKSTEXTILE.NS', 'SMARTLINK.NS', 'SMCGLOBAL.NS', 'SMLISUZU.NS', 'SMPL.NS',
  'SMSLIFE.NS', 'SMSPHARMA.NS', 'SNOWMAN.NS', 'SOBHA.NS', 'SOFTTECH.NS',
  'SOLARA.NS', 'SOLARINDS.NS', 'SOMANYCERA.NS', 'SOMATEX.NS', 'SONACOMS.NS',
  'SONATSOFTW.NS', 'SORILINFRA.NS', 'SOTL.NS', 'SOUTHBANK.NS', 'SOUTHWEST.NS',
  'SPAL.NS', 'SPANDANA.NS', 'SPARC.NS', 'SPECIALITY.NS', 'SPENCERS.NS',
  'SPIC.NS', 'SPICEJET.NS', 'SPL.NS', 'SPMLINFRA.NS', 'SPTL.NS',
  'SREEL.NS', 'SREINFRA.NS', 'SRF.NS', 'SRHHYPOLTD.NS', 'SRPL.NS',
  'SSINFRA.NS', 'SSPDL.NS', 'SSWL.NS', 'STAR.NS', 'STARCEMENT.NS',
  'STARHEALTH.NS', 'STARPAPER.NS', 'STARTECK.NS', 'STCINDIA.NS', 'STEELCAS.NS',
  'STEELCITY.NS', 'STEELXIND.NS', 'STEL.NS', 'STERTOOLS.NS', 'STLTECH.NS',
  'STOVEKRAFT.NS', 'STRENGTH.NS', 'SUBEXLTD.NS', 'SUBROS.NS', 'SUDHARSAN.NS',
  'SUKHJITS.NS', 'SULDER.NS', 'SUMICHEM.NS', 'SUMIT.NS', 'SUMMITSEC.NS',
  'SUNCLAY.NS', 'SUNDARAM.NS', 'SUNDARMFIN.NS', 'SUNDRMFAST.NS', 'SUNFLAG.NS',
  'SUNPHARMA.NS', 'SUNTECK.NS', 'SUPRAJIT.NS', 'SUPREMEENG.NS', 'SUPREMEIND.NS',
  'SUPREMEPVC.NS', 'SUPRAPNT.NS', 'SUULD.NS', 'SUVEN.NS', 'SUVENPHAR.NS',
  'SUVIDHAA.NS', 'SVLL.NS', 'SVPGLOB.NS', 'SWANENERGY.NS', 'SWARAJENG.NS',
  'SWELECTES.NS', 'SWSOLAR.NS', 'SYMPHONY.NS', 'SYNCOMF.NS', 'SYNGENE.NS',
  'TAINWALCHM.NS', 'TAJGVK.NS', 'TAKE.NS', 'TALBROAUTO.NS', 'TANLA.NS',
  'TANTIACONS.NS', 'TARACHAND.NS', 'TARAPUR.NS', 'TARC.NS', 'TARMAT.NS',
  'TARSONS.NS', 'TASTYBITE.NS', 'TATACHEM.NS', 'TATACOMM.NS', 'TATAELXSI.NS',
  'TATAINVEST.NS', 'TATAMOTORS.NS', 'TATAMTRDVR.NS', 'TATAPOWER.NS', 'TATASTEEL.NS',
  'TATVA.NS', 'TBZ.NS', 'TCI.NS', 'TCIDEVELOP.NS', 'TCIEXP.NS',
  'TCIFINANCE.NS', 'TCNSBRANDS.NS', 'TCPLPACK.NS', 'TCS.NS', 'TDPOWERSYS.NS',
  'TEAMLEASE.NS', 'TECHIN.NS', 'TECHM.NS', 'TECHNOE.NS', 'TECIL.NS',
  'TEGA.NS', 'TEJASNET.NS', 'TEMBO.NS', 'TERASOFT.NS', 'TEXINFRA.NS',
  'TEXMOPIPES.NS', 'TEXRAIL.NS', 'TFCILTD.NS', 'TFL.NS', 'TGIF.NS',
  'THANGAMAYL.NS', 'THEINVEST.NS', 'THEMISMED.NS', 'THERMAX.NS', 'THOMASCOOK.NS',
  'THYROCARE.NS', 'TI.NS', 'TIDEWATER.NS', 'TIINDIA.NS', 'TIL.NS',
  'TIMESGTY.NS', 'TIMETECHNO.NS', 'TIMKEN.NS', 'TINPLATE.NS', 'TIPSFILMS.NS',
  'TITAN.NS', 'TMRVL.NS', 'TNPETRO.NS', 'TNPL.NS', 'TOKYOPLAST.NS',
  'TORNTPHARM.NS', 'TORNTPOWER.NS', 'TPLPLASTEH.NS', 'TRAIL.NS', 'TRANSFIN.NS',
  'TRANSIND.NS', 'TRANSWARR.NS', 'TRANSWORLD.NS', 'TREEHOUSE.NS', 'TREJHARA.NS',
  'TRENT.NS', 'TRF.NS', 'TRIDENT.NS', 'TRIGYN.NS', 'TRIL.NS',
  'TRITURBINE.NS', 'TRIVENI.NS', 'TTKHLTCARE.NS', 'TTKPRESTIG.NS', 'TTL.NS',
  'TTML.NS', 'TV18BRDCST.NS', 'TVSELECT.NS', 'TVSMOTOR.NS', 'TVSSRICHAK.NS',
  'TVTODAY.NS', 'TVVISION.NS', 'TWL.NS', 'UBL.NS', 'UCAL.NS',
  'UCOBANK.NS', 'UDAICEMENT.NS', 'UFLEX.NS', 'UFO.NS', 'UGARSUGAR.NS',
  'UJAAS.NS', 'UJJIVAN.NS', 'UJJIVANSFB.NS', 'ULTRACEMCO.NS', 'UMANGDAIRY.NS',
  'UMESLTD.NS', 'UNICHEMLAB.NS', 'UNIDT.NS', 'UNIENTER.NS', 'UNIONBANK.NS',
  'UNIPLY.NS', 'UNITECH.NS', 'UNITEDBNK.NS', 'UNITEDPOLY.NS', 'UNITEDTEA.NS',
  'UNIVPHOTO.NS', 'UNOMINDA.NS', 'UPL.NS', 'URJA.NS', 'USHAMART.NS',
  'UTIAMC.NS', 'UTTAMSUGAR.NS', 'V2RETAIL.NS', 'VADILALIND.NS', 'VAIBHAVGBL.NS',
  'VAKRANGEE.NS', 'VALIANTORG.NS', 'VARDHACRLC.NS', 'VARDMNPOLY.NS', 'VARROC.NS',
  'VASCONEQ.NS', 'VASWANI.NS', 'VBL.NS', 'VCL.NS', 'VEDL.NS',
  'VENKEYS.NS', 'VENUSPIPES.NS', 'VENUSREM.NS', 'VERANDA.NS', 'VERTOZ.NS',
  'VESUVIUS.NS', 'VETO.NS', 'VGUARD.NS', 'VHL.NS', 'VIDHIING.NS',
  'VIJAYA.NS', 'VIKASECO.NS', 'VIKASLIFE.NS', 'VIMTALABS.NS', 'VINATIORGA.NS',
  'VINDHYATEL.NS', 'VINEETLAB.NS', 'VINNY.NS', 'VINYLINDIA.NS', 'VIPCLOTHNG.NS',
  'VIPIND.NS', 'VIPULLTD.NS', 'VISAKAIND.NS', 'VISHAL.NS', 'VISHNU.NS',
  'VISHWARAJ.NS', 'VIVIDHA.NS', 'VIVIMEDLAB.NS', 'VLSFINANCE.NS', 'VMART.NS',
  'VMS.NS', 'VOLTAMP.NS', 'VOLTAS.NS', 'VRLLOG.NS', 'VSSL.NS',
  'VSTIND.NS', 'VSTTILLERS.NS', 'VTL.NS', 'WABAG.NS', 'WALCHANNAG.NS',
  'WANBURY.NS', 'WATERBASE.NS', 'WEBELSOLAR.NS', 'WEIZMANIND.NS', 'WEL.NS',
  'WELCORP.NS', 'WELENT.NS', 'WELINV.NS', 'WELSPUNLIV.NS', 'WENDT.NS',
  'WESTLIFE.NS', 'WHEELS.NS', 'WHIRLPOOL.NS', 'WILLAMAGOR.NS', 'WINDMACHIN.NS',
  'WINSOME.NS', 'WIPRO.NS', 'WOCKPHARMA.NS', 'WONDERLA.NS', 'WORTH.NS',
  'WSI.NS', 'WSTCSTPAPR.NS', 'XCHANGING.NS', 'XELPMOC.NS', 'XPROINDIA.NS',
  'YAARI.NS', 'YESBANK.NS', 'YUKEN.NS', 'ZEEL.NS', 'ZEEMEDIA.NS',
  'ZENITHEXPO.NS', 'ZENITHSTL.NS', 'ZENSARTECH.NS', 'ZENTEC.NS', 'ZFCVINDIA.NS',
  'ZODIACLOTH.NS', 'ZODJRDMKJ.NS', 'ZOTA.NS', 'ZUARI.NS', 'ZUARIGLOB.NS',
  'ZYDUSLIFE.NS', 'ZYDUSWELL.NS',
  // BSE stocks (selected)
  'RELIANCE.BO', 'TCS.BO', 'HDFCBANK.BO', 'ICICIBANK.BO', 'SBIN.BO',
  'INFY.BO', 'BHARTIARTL.BO', 'ITC.BO', 'WIPRO.BO', 'LT.BO',
  'HINDUNILVR.BO', 'NTPC.BO', 'ONGC.BO', 'POWERGRID.BO', 'TITAN.BO',
  'MARUTI.BO', 'SUNPHARMA.BO', 'AXISBANK.BO', 'KOTAKBANK.BO', 'ULTRACEMCO.BO',
  'ASIANPAINT.BO', 'M&M.BO', 'TATASTEEL.BO', 'HCLTECH.BO', 'BAJFINANCE.BO',
  'ADANIPORTS.BO', 'NESTLEIND.BO', 'HINDALCO.BO', 'GRASIM.BO', 'JSWSTEEL.BO',
  'TATAMOTORS.BO', 'TATAPOWER.BO', 'HDFC.BO', 'INDUSINDBK.BO', 'TECHM.BO',
  'BRITANNIA.BO', 'DRREDDY.BO', 'CIPLA.BO', 'BAJAJFINSV.BO', 'SBILIFE.BO',
  'EICHERMOT.BO', 'DIVISLAB.BO', 'APOLLOHOSP.BO', 'COALINDIA.BO', 'BPCL.BO',
  'IOC.BO', 'GAIL.BO', 'HEROMOTOCO.BO', 'LT.BO', 'DMART.BO',
];

async function fetchQuotesInBatches(symbols: string[]): Promise<{
  symbol: string; exchange: string; sector: string;
  price: number | undefined; volume: number | undefined;
}[]> {
  const results: {
    symbol: string; exchange: string; sector: string;
    price: number | undefined; volume: number | undefined;
  }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < symbols.length; i += 50) {
    const batch = symbols.slice(i, i + 50);
    try {
      const quotes = await yahooFinance.quote(batch);
      for (const q of quotes) {
        if (seen.has(q.symbol)) continue;
        seen.add(q.symbol);
        results.push({
          symbol: q.symbol,
          exchange: getExchangeFromSymbol(q.symbol),
          sector: q.summaryProfile?.sector ?? q.sector ?? 'N/A',
          price: q.regularMarketPrice,
          volume: q.regularMarketVolume,
        });
      }
    } catch {
      try {
        for (const sym of batch) {
          try {
            const q = await yahooFinance.quote(sym);
            if (seen.has(q.symbol)) continue;
            seen.add(q.symbol);
            results.push({
              symbol: q.symbol,
              exchange: getExchangeFromSymbol(q.symbol),
              sector: q.summaryProfile?.sector ?? q.sector ?? 'N/A',
              price: q.regularMarketPrice,
              volume: q.regularMarketVolume,
            });
          } catch { /* skip single failure */ }
        }
      } catch { /* skip batch */ }
    }
  }
  return results;
}

export async function GET() {
  try {
    let allSymbols = new Set<string>();

    const [searchSymbols, screenerSymbols] = await Promise.all([
      discoverViaSearch().catch(() => new Set<string>()),
      discoverViaScreener().catch(() => new Set<string>()),
    ]);

    for (const s of searchSymbols) allSymbols.add(s);
    for (const s of screenerSymbols) allSymbols.add(s);

    if (allSymbols.size < 50) {
      for (const sym of FALLBACK_SYMBOLS) {
        allSymbols.add(sym);
      }
    }

    let symbolList = [...allSymbols];
    const results = await fetchQuotesInBatches(symbolList);

    if (results.length === 0 && FALLBACK_SYMBOLS.length > 0) {
      const fallbackResults = await fetchQuotesInBatches(FALLBACK_SYMBOLS);
      return NextResponse.json(fallbackResults, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
