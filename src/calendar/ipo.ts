import { parseHTML } from "linkedom";

export default async () => {
  const response = await fetch("https://www.iposcoop.com/ipo-calendar/");
  const html = await response.text();

  const result: Array<{
    company: string,
    company_des_url:string,
    symbol: string,
    managers: string,
    shares_millions: number,
    price_low: number,
    price_high: number,
    expected_date:string
  }> = [];

  const { document } = parseHTML(html);
  const trs = document.querySelectorAll('#main-content table tbody tr');

  for (const tr of trs) {
    const tds = tr.querySelectorAll('td')
    if (tds.length < 9) continue

    const companyA = tds[0].querySelector('a')

    result.push({
      company: tds[0].textContent?.trim() ?? '',
      company_des_url: companyA?.getAttribute('href') ?? '',
      symbol: tds[1].textContent?.trim() ?? '',
      managers: tds[2].textContent?.trim() ?? '',
      shares_millions: parseFloat(tds[3].textContent?.trim() ?? '') || 0,
      price_low: parseFloat(tds[4].textContent?.trim() ?? '') || 0,
      price_high: parseFloat(tds[5].textContent?.trim() ?? '') || 0,
      expected_date: tds[7].textContent?.trim() ?? '',
    })
   }

  return result;
}
