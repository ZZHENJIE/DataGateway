export default async (from:string,to:string,keyword:string) => {
  const url = `https://translate.google.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${keyword}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      Accept: '*/*',
    },
    cache: 'no-store',
  });
  const json = await response.json();

  const result = [];

  for (const item of json[0]) {
    result.push(item[0]);
  }

  return result.join('');
}
