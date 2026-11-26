// 地震保険料控除いくら？の問題を作る（ブラウザと node の両方で使う）。
// 中身は、国税庁タックスアンサー No.1145「地震保険料控除」に書いてあることだけ（［令和8年4月1日現在法令等］。2026-11-17 に読んだ。要点は共有フォルダ games/jishin-ikura-research.md）。
// 1問は、1年に払った地震保険料・旧長期損害保険料・ほかの火災保険料を読んで、地震保険料控除の額を選ぶ。正解したら2段目「どの決まり？」を選ぶ。
// 答えはコードで計算する：地震保険料は5万円まで全額・超えると5万円。旧長期損害保険料は1万円まで全額・2万円まで ×1/2+5,000円・超えると1.5万円。
//   両方は合計（最高5万円）。1つの契約で両方を払っているときは、どちらか一方（このゲームでは多いほうを選ぶ）。
//   旧長期損害保険料は、平成18年12月31日までに結んだ（始まりが平成19年1月1日以後を除く）・満期返戻金があり10年以上・平成19年1月1日以後に変えていない契約だけ。
//   ほかの火災保険料（地震保険をつけていない）は、平成19年分から損害保険料控除が廃止されたので入らない。
// 旧長期損害保険料は1,000円単位にして、×1/2 に端数が出ないようにする（No.1145 に端数の決まりが書いていないため）。
// 税額・対象になる家屋や家財（No.1146）・剰余金・住民税・申告の手続きは扱わない（画面に書く）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。
// KINDS の並びは最後に足すだけにする（並べ替え・削除をすると過去の日の問題が変わる）。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const AS_OF = "令和8年4月1日現在法令等";

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    a: ["国税庁 タックスアンサー No.1145 地震保険料控除", "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1145.htm"],
  };
  const MEDIA = { a: "1年に払った保険料（所得税）" };
  const MAN = 10000;
  // 地震保険料・旧長期損害保険料の表（No.1145）
  function calcJ(x) { return x <= 50000 ? x : 50000; }
  function calcK(x) { return x <= 10000 ? x : x <= 20000 ? x / 2 + 5000 : 15000; }
  // J 地震保険料（2つの契約は J と J2）・K 旧長期損害保険料・one 1つの契約で両方（多いほうを選ぶ）
  function deductOf(J, J2, K, one) {
    if (one) return Math.max(calcJ(J), calcK(K));
    return Math.min(calcJ(J + J2) + calcK(K), 50000);
  }

  // 2段目「どの決まり？」
  const GROUPS = {
    jishin: { name: "地震保険料", sub: "5万円まで全額", set: "all" },
    kyu: { name: "旧長期損害保険料", sub: "1万円まで全額・最高1.5万円", set: "all" },
    awase: { name: "両方を足す", sub: "合計で最高5万円", set: "all" },
    hitotsu: { name: "1つの契約で両方", sub: "どちらか一方", set: "all" },
    none: { name: "対象にならない", sub: "ふつうの火災保険など", set: "all" },
  };
  const GRP_WHY = {
    jishin: "地震保険料は、1年に払った合計が5万円までなら全額、5万円を超えると5万円です。",
    kyu: "旧長期損害保険料は、1万円まで全額、2万円まで半分＋5,000円、2万円を超えると1.5万円です。",
    awase: "地震保険料と旧長期損害保険料の両方があれば、それぞれ計算して足します。合計は5万円までです。",
    hitotsu: "1つの契約で地震保険料と旧長期損害保険料の両方を払っていると、どちらか一方の控除を選びます。",
    none: "損害保険料控除は平成19年分から廃止されました。旧長期損害保険料の条件に合わない火災保険料は入りません。",
  };
  const KEY = {
    jishin: "地震保険料は5万円まで全額",
    kyu: "旧長期：1万円まで全額・2万円まで半分＋5,000円・最高1.5万円",
    awase: "両方は足して、最高5万円",
    hitotsu: "1つの契約で両方なら、どちらか一方",
    none: "ふつうの火災保険料や条件に合わない契約は0円",
  };

  // 種類：[id, 難しさ, 2段目, 場面（＄J・＄G 地震保険料・＄M 地震保険料の1か月分・＄K 旧長期損害保険料・＄X 入らない保険料）, {J, G, K, X, M}: [下限, 上限, 刻み], 1つの契約か, ヒント1]
  const D = [
    ["j_zen", 0, "jishin", "地震保険の保険料を、1年に＄J払った。", { J: [5000, 50000, 1000] }, 0, "5万円以下なら？"],
    ["j_max", 0, "jishin", "地震保険の保険料を、1年に＄J払った。", { J: [51000, 120000, 1000] }, 0, "5万円を超えると？"],
    ["k_zen", 0, "kyu", "旧長期損害保険料を、1年に＄K払った。", { K: [2000, 10000, 1000] }, 0, "1万円以下なら？"],
    ["k_half", 0, "kyu", "旧長期損害保険料を、1年に＄K払った。", { K: [11000, 20000, 1000] }, 0, "1万円超2万円以下は、半分＋5,000円。"],
    ["k_max", 0, "kyu", "旧長期損害保険料を、1年に＄K払った。", { K: [21000, 60000, 1000] }, 0, "2万円を超えると？"],
    ["a_both", 0, "awase", "地震保険料＄Jと、別の契約の旧長期損害保険料＄Kを払った。", { J: [5000, 30000, 1000], K: [2000, 20000, 1000] }, 0, "それぞれ計算して足す。"],
    ["n_kasai", 0, "none", "2015年に入った火災保険（地震保険はつけていない）に＄X払った。", { X: [10000, 60000, 1000] }, 0, "ふつうの火災保険料は？"],
    ["h_one", 0, "hitotsu", "1つの契約で地震保険料＄Jと旧長期損害保険料＄Kを払い、多いほうを選ぶ。", { J: [5000, 30000, 1000], K: [5000, 30000, 1000] }, 1, "1つの契約なら、どちらか一方。"],
    ["j_two", 0, "jishin", "地震保険の保険料を、家の契約で＄J、別の契約で＄G払った。", { J: [5000, 25000, 1000], G: [5000, 25000, 1000] }, 0, "地震保険料は合計で見る。"],
    ["j_mid", 0, "jishin", "マンションの地震保険の保険料を、1年に＄J払った。", { J: [20000, 50000, 1000] }, 0, "5万円以下なら？"],
    ["w_50k", 1, "jishin", "地震保険の保険料を、1年にちょうど＄J払った。", { J: [50000, 50000, 1] }, 0, "5万円「以下」に入る？"],
    ["w_10k", 1, "kyu", "旧長期損害保険料を、1年にちょうど＄K払った。", { K: [10000, 10000, 1] }, 0, "1万円「以下」に入る？"],
    ["w_20k", 1, "kyu", "旧長期損害保険料を、1年にちょうど＄K払った。", { K: [20000, 20000, 1] }, 0, "2万円「以下」の行。"],
    ["a_cap", 1, "awase", "地震保険料＄Jと、別の契約の旧長期損害保険料＄Kを払った。", { J: [40000, 60000, 1000], K: [11000, 40000, 1000] }, 0, "足すと5万円を超える？"],
    ["n_5nen", 1, "none", "2004年に結んだ保険期間5年の火災保険（満期返戻金あり）に＄X払った。", { X: [10000, 60000, 1000] }, 0, "旧長期は10年以上の契約。"],
    ["n_henko", 1, "none", "2003年に結んだ長期の損害保険で、2010年に契約を変えたものに＄X払った。", { X: [10000, 60000, 1000] }, 0, "平成19年以後に変えると？"],
    ["h_one2", 1, "hitotsu", "1つの契約で地震保険料＄Jと旧長期損害保険料＄Kを払い、多いほうを選ぶ。", { J: [30000, 60000, 1000], K: [2000, 15000, 1000] }, 1, "足さずに、どちらか一方。"],
    ["a_kasai", 1, "jishin", "地震保険の保険料＄Jと、2016年に入った火災保険（地震保険なし）に＄Xを払った。", { J: [5000, 50000, 1000], X: [10000, 40000, 1000] }, 0, "火災保険料は入る？"],
    ["k_long", 1, "kyu", "2006年に結んだ満期返戻金のある20年の損害保険（旧長期損害保険料）に＄K払った。", { K: [5000, 40000, 1000] }, 0, "旧長期の表で見る。"],
    ["j_two2", 1, "jishin", "地震保険の保険料を、家の契約で＄J、別の契約で＄G払った。", { J: [26000, 50000, 1000], G: [26000, 50000, 1000] }, 0, "合計が5万円を超えると？"],
    ["a_small", 1, "awase", "地震保険料＄Jと、別の契約の旧長期損害保険料＄Kを払った。", { J: [1000, 10000, 1000], K: [2000, 10000, 1000] }, 0, "それぞれ全額なら？"],
    ["k_mid", 1, "kyu", "2001年に結んだ旧長期損害保険料を、1年に＄K払った。", { K: [12000, 18000, 2000] }, 0, "1万円超2万円以下の行。"],
    ["n_19", 2, "none", "2006年12月に結び、2007年1月に始まった長期の損害保険に＄X払った。", { X: [10000, 60000, 1000] }, 0, "始まりが平成19年以後だと？"],
    ["w_11k", 2, "kyu", "旧長期損害保険料を、1年にちょうど＄K払った。", { K: [11000, 11000, 1] }, 0, "1万円を少し超えると？"],
    ["a_cap2", 2, "awase", "地震保険料＄Jと、別の契約の旧長期損害保険料＄Kを払った。", { J: [40000, 50000, 1000], K: [21000, 40000, 1000] }, 0, "5万円＋1.5万円は？"],
    ["h_one3", 2, "hitotsu", "1つの契約で地震保険料＄Jと旧長期損害保険料＄Kを払い、多いほうを選ぶ。", { J: [3000, 14000, 1000], K: [21000, 50000, 1000] }, 1, "旧長期の控除は最高1.5万円。"],
    ["h_eq", 2, "hitotsu", "1つの契約で地震保険料と旧長期損害保険料を＄Jずつ払い、多いほうを選ぶ。", { J: [2000, 10000, 1000] }, 1, "同じ額なら、控除も同じ？"],
    ["n_mankai", 2, "none", "2005年に結んだ満期返戻金のない10年の火災保険に＄X払った。", { X: [10000, 60000, 1000] }, 0, "満期返戻金がないと？"],
    ["a_three", 2, "awase", "地震保険料を2つの契約で＄Jと＄G、別の契約の旧長期損害保険料を＄K払った。", { J: [5000, 20000, 1000], G: [5000, 20000, 1000], K: [2000, 30000, 1000] }, 0, "地震保険料を足してから。"],
    ["k_mix", 2, "kyu", "旧長期損害保険料＄Kと、2012年に入った火災保険（地震保険なし）に＄Xを払った。", { K: [5000, 30000, 1000], X: [20000, 40000, 1000] }, 0, "入るのは旧長期だけ。"],
    ["w_22k", 2, "kyu", "旧長期損害保険料を、1年に＄K払った。", { K: [22000, 26000, 2000] }, 0, "2万円を超えると？"],
    ["h_vs", 2, "hitotsu", "1つの契約で地震保険料＄Jと旧長期損害保険料＄Kを払い、多いほうを選ぶ。", { J: [30000, 45000, 1000], K: [10000, 20000, 1000] }, 1, "足せないので、多いほう。"],
    ["j_month", 2, "jishin", "地震保険の保険料を、毎月＄Mずつ12か月払った。", { M: [2000, 6000, 500] }, 0, "1年の合計は？"],
    ["n_2012", 2, "none", "2012年に結んだ満期返戻金のある10年の火災保険に＄X払った。", { X: [10000, 60000, 1000] }, 0, "旧長期は平成18年までの契約。"],
    ["a_month", 2, "awase", "地震保険料を毎月＄Mずつ12か月と、別の契約の旧長期損害保険料＄Kを払った。", { M: [2000, 4000, 500], K: [2000, 30000, 1000] }, 0, "地震保険料の1年分を出してから。"],
  ];

  const yen = (n) => n.toLocaleString("ja-JP") + "円";
  const man = (n) => (n !== 0 && n % MAN === 0 ? `${(n / MAN).toLocaleString("ja-JP")}万円` : yen(n));
  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  const pickAmt = (R, lo, hi, step) => lo + ri(R, 0, Math.floor((hi - lo) / step)) * step;
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end

  const label = (t) => (t === 0 ? "0円（控除なし）" : yen(t));
  function maker(sent, spec, one) {
    return (R) => {
      const v = {};
      for (const f of ["J", "G", "K", "X", "M"]) v[f] = spec[f] ? pickAmt(R, spec[f][0], spec[f][1], spec[f][2]) : 0;
      if (v.M) v.J = v.M * 12;
      if (/＄Jずつ/.test(sent)) v.K = v.J; // 1つの契約で同じ額ずつ
      const J = v.J, G = v.G, K = v.K, X = v.X;
      const ans = deductOf(J, G, K, one);
      const sentence = sent.replace("＄J", man(J)).replace("＄G", man(G)).replace("＄K", man(K)).replace("＄X", man(X)).replace("＄M", man(v.M));
      // 選び肢：足し忘れ・5万円の上限の見落とし・1つの契約で足す・旧長期を全額にする・入らない保険料を入れる・0円 から3つ
      const cand = new Set([calcJ(J + G) + calcK(K), J + G + K, deductOf(J, G, K, !one), Math.min(calcJ(J + G) + K, 50000), Math.min(calcJ(J + G + X) + calcK(K), 50000), Math.min(J + G + K + X, 50000), calcJ(J) + calcJ(G), 15000, 50000, 0, v.M]);
      const ok = (x) => Number.isInteger(x) && x >= 0 && x !== ans;
      const wrong0 = [...cand].filter(ok);
      for (const x of [ans + 5000, ans + 2500, ans + 10000, 10000, 5000]) { if (wrong0.length >= 3) break; if (ok(x) && !wrong0.includes(x)) wrong0.push(x); }
      const wrong = pickN(R, [...new Set(wrong0)].sort((x, y) => x - y), 3);
      const opts = shuffle(R, [ans, ...wrong]).map(label);
      const parts = [];
      if (J + G) parts.push(`地震${yen(calcJ(J + G))}`);
      if (K) parts.push(`旧長期${yen(calcK(K))}`);
      const how = !parts.length ? "対象になる保険料がない" : one ? `${parts.join("・")}の多いほう` : parts.length > 1 ? `${parts.join("＋")}（最高5万円）` : parts[0];
      const full = `${sentence} → ${how}：${label(ans)}`;
      return { type: "act", q: `${sentence}　控除はいくら？`, opts, ans: label(ans), rev: false, full, J, G, K, X, M: v.M, one: !!one, deduct: ans, v: `${J}/${G}/${K}/${X}` };
    };
  }
  // 金額の組が6通りより少ない種類は lo=hi にする（QA の「6通り以上」から外す）
  const cnt = (spec) => Object.values(spec).reduce((n, sp) => n * (Math.floor((sp[1] - sp[0]) / sp[2]) + 1), 1);
  const KINDS = D.map(([id, lv, grp, sent, spec, one, look]) => ({ id, lv, grp, col: "a", sent, lo: 0, hi: cnt(spec) < 6 ? 0 : 1, look, src: ["a"], name: GROUPS[grp].name + "：" + sent.replace(/＄./g, "○円").slice(0, 22) + "…", key: KEY[grp], why: GRP_WHY[grp], make: maker(sent, spec, one) }));
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);
  const GRP_OF = Object.fromEntries(KINDS.map((k) => [k.id, k.grp]));
  const groupsOf = (g) => Object.keys(GROUPS).filter((x) => GROUPS[x].set === GROUPS[g].set);

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  function make(tag) {
    const [kind] = String(tag).split("|"), k = BY[kind];
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp, gwhy: GRP_WHY[k.grp], media: MEDIA[k.col], src: k.src.map((s) => SRC[s]), ...p };
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const JSN = { KINDS, BY, GROUPS, GRP_OF, GRP_WHY, LV, SRC, MEDIA, AS_OF, calcJ, calcK, deductOf, kindsOf, groupsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = JSN; else root.JSN = JSN;
})(typeof self !== "undefined" ? self : this);
