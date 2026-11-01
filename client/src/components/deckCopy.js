/**
 * deckCopy.js — every string the result deck owns, in the three locales the app
 * already supports. Nothing here touches i18n.js: tier names, crisis banner and
 * fallback note keep coming from the translation object already passed down, so
 * the canonical tier wording stays in exactly one place.
 *
 * Copy rules (kept deliberately, see docs/result-deck-plan.md §5):
 *   - describe inputs, never the person ("your inputs read as…")
 *   - no clinical vocabulary, no severity judgement, no predictions
 *   - numerals live in the chrome (page counter, tier chip), not in prose
 */

const en = {
  chrome: {
    pageOf: (i, n) => `${String(i).padStart(2, "0")} / ${String(n).padStart(2, "0")}`,
    pageLabel: (i, n) => `Page ${i} of ${n}`,
    close: "Close",
    previous: "Previous page",
    next: "Next page",
    nextShort: "Next",
    infoOnly: "Informational coaching only — not diagnosis, not counselling.",
    cedars: "CEDARS",
    fullDisclaimer: "Full disclaimer",
    swipe: "Swipe or use the arrow keys",
  },

  /* the opening beat — the same word-reveal the home page uses */
  intro: {
    kicker: "Your check-in",
    words: ["Your", "results"],
    sub: "A few pages, read from the eight values you entered. Nothing is stored.",
    skip: "Tap anywhere to skip",
  },

  labels: {
    Study_Hours_Per_Day: "Study",
    Sleep_Hours_Per_Day: "Sleep",
    Stress_Level: "Stress",
    Attendance_Rate: "Attendance",
    Age: "Age",
    Extracurricular_Activities: "Extracurriculars",
    Exam_Proximity: "Exam timing",
    Part_Time_Job: "Part-time job",
  },

  bands: {
    farBelow: "well below average",
    below: "below average",
    onPar: "about average",
    above: "above average",
    farAbove: "well above average",
  },

  signals: {
    protective: "protective",
    mild: "mild signal",
    moderate: "moderate signal",
    strong: "strong signal",
    neutral: "no clear signal",
  },

  pages: {
    p01: {
      kicker: "The numbers",
      title: "Where your inputs sit",
      lede: "Position against the average profile in the model's training data. These are placements, not scores to chase.",
      railNote: "Left of the notch sits below average, right sits above. The band, not the raw value, is what the coach is told.",
      scaleTitle: "And what that adds up to",
      scaleCaption: (line) => `The dashed line at ${line}% is where the model stops calling a profile Stable and starts calling it At Risk.`,
      scaleLow: "Very low",
      scaleHigh: "High",
      tierNote: "The tier speaks only to grade risk. It is not a comment on how you are doing.",
    },
    p02: {
      kicker: "Your pattern",
      caption: "It describes the shape of this week — not who you are.",
    },
    p03: { kicker: "What it means", fallbackTitle: "Reading your pattern" },
    p04: { kicker: "The read", fallbackTitle: "What this pattern suggests" },
    p05: { kicker: "Three moves", fallbackTitle: "For the week ahead" },
    p06: { kicker: "Your week" },
    p07: {
      kicker: "The machinery",
      title: "What the z-scores mean",
      lede: "A z-score is a position, not a mark. It counts how many typical spreads you sit from the average student in the training data — zero is average, and the sign says which side you are on.",
      unit: "z",
      axisLow: "below average",
      axisMid: "average",
      axisHigh: "above average",
      note: "These are the three inputs sitting furthest from the average. They are not weights, and they are not added up — the model reads all eight values together.",
    },
    p08: {
      kicker: "The fine print",
      title: "What this is — and isn't",
      isTitle: "This is",
      isNotTitle: "This is not",
      is: [
        "A reflection of eight structured inputs you entered",
        "Informational coaching, written for you",
        "A reason to check in with yourself",
      ],
      isNot: [
        "Academic advising, or a replacement for it",
        "Psychological counselling",
        "A diagnosis or medical advice",
        "An assessment of your mental health",
        "A decision about your academic standing",
        "A record — nothing you enter is stored",
      ],
      supportTitle: "If you'd rather talk to a person",
      supportBody:
        "HKU CEDARS — Counselling and Person Enrichment — sees students without a referral. If you are in immediate danger, contact emergency services.",
      again: "Run another check-in",
      close: "Close",
    },
  },

  /**
   * What each tier actually means, in plain terms. The model's label is the
   * grade band (A/B vs C–F) in the training data, so every line here is about
   * grades — never about the person, and never a prediction about them.
   */
  tiers: {
    "Very Low":
      "In the training data, similar profiles finished with A or B more than seven times in ten. Nothing here needs fixing — the useful move is keeping the week as it is.",
    Low: "Similar profiles finished with A or B more often than not. Read plainly: the grades you are aiming for are still within reach — this is a pattern to protect, not one to repair.",
    Moderate:
      "Close to a coin flip. Similar profiles split roughly evenly between A–B and C–F, which means small changes this week move this more than they would at either end of the scale.",
    High: "About three in four similar profiles finished with C to F. That is a reason to change the shape of this week — not a verdict on what you are capable of.",
  },

  crisis: {
    bannerTitle: "These inputs point to a heavy stretch",
    bannerBody:
      "If it feels like more than you can carry, HKU CEDARS is there for students — no referral needed.",
    tierNote:
      "The tier is a grade-risk figure only. The flag above is a separate check on how heavy the week looks, and it takes priority over this number.",
  },

  fallback: {
    unavailable: "The coach couldn't be reached just now. Standard guidance is shown below.",
    empty: "Nothing came back from the coach this time. Your numbers and the support page are still here.",
  },

  /**
   * Archetypes. `name` labels a pattern, never a person.
   * `drivers` are the sentences handed to the LLM so it explains the rule that
   * actually fired — band words and signal words only, never a raw value.
   */
  archetypes: {
    night_shift: {
      name: "The Night Shift",
      oneLine: "You sleep less and study more, so each day starts a little later than the one before.",
      drivers: ["sleep sits below average", "study time sits above average"],
    },
    pressure: {
      name: "The Pressure Pattern",
      oneLine: "Stress is carrying the most weight right now, and rest is the first thing to give way.",
      drivers: ["stress sits above average", "sleep sits below average"],
    },
    drift: {
      name: "The Drifting Pattern",
      oneLine: "Attendance and sleep are both loosening, and the week has stopped holding a reliable shape.",
      drivers: ["attendance sits below average", "sleep sits below average"],
    },
    double_shift: {
      name: "The Double Shift",
      oneLine: "Work and study are drawing from the same hours, so one of them is always running behind.",
      drivers: ["a part-time job carries a strong signal", "study time sits above average"],
    },
    sprint: {
      name: "The Sprint Pattern",
      oneLine: "An exam is close, and everything is being squeezed into the next few weeks.",
      drivers: ["an exam is near", "stress sits above average"],
    },
    grind: {
      name: "The Long Run",
      oneLine: "You are putting in long, steady hours — and the rhythm around them is still holding.",
      drivers: ["study time sits well above average", "stress sits around average or lower"],
    },
    recovery: {
      name: "The Recovery Pattern",
      oneLine: "Sleep and stress are both sitting in the healthier half of the range.",
      drivers: ["sleep sits above average", "stress sits below average"],
    },
    balanced: {
      name: "The Balanced Load",
      oneLine: "Something outside class is holding you steady, and study sits in the middle.",
      drivers: ["extracurriculars read as protective", "study time sits around average"],
    },
    routine: {
      name: "The Routine Keeper",
      oneLine: "Attendance is holding, and your week has a shape you can predict.",
      drivers: ["attendance sits above average", "stress sits around average"],
    },
    open: {
      name: "The Open Chapter",
      oneLine: "Nothing in your inputs is shouting for attention — the shape of this week is still yours to set.",
      drivers: ["no dominant signal in the summary"],
    },
  },

  /** exact headings the client splits on — must match pageContract.js */
  headings: {
    means: "What that means",
    read: "The read",
    moves: "Three moves",
    week: "Your week",
  },
};

const zhHant = {
  chrome: {
    pageOf: (i, n) => `${String(i).padStart(2, "0")} / ${String(n).padStart(2, "0")}`,
    pageLabel: (i, n) => `第 ${i} 頁，共 ${n} 頁`,
    close: "關閉",
    previous: "上一頁",
    next: "下一頁",
    nextShort: "下一頁",
    infoOnly: "僅供參考的學業指導 — 並非診斷，亦非輔導。",
    cedars: "CEDARS",
    fullDisclaimer: "完整聲明",
    swipe: "可滑動或使用方向鍵",
  },

  intro: {
    kicker: "你的檢查",
    words: ["你的", "結果"],
    sub: "七頁，讀自你輸入的八項資料。不會留下任何紀錄。",
    skip: "點任何位置即可略過",
  },

  labels: {
    Study_Hours_Per_Day: "讀書",
    Sleep_Hours_Per_Day: "睡眠",
    Stress_Level: "壓力",
    Attendance_Rate: "出席",
    Age: "年齡",
    Extracurricular_Activities: "課外活動",
    Exam_Proximity: "考試時間",
    Part_Time_Job: "兼職",
  },

  bands: {
    farBelow: "遠低於平均",
    below: "低於平均",
    onPar: "接近平均",
    above: "高於平均",
    farAbove: "遠高於平均",
  },

  signals: {
    protective: "保護性",
    mild: "輕微訊號",
    moderate: "中等訊號",
    strong: "明顯訊號",
    neutral: "無明顯訊號",
  },

  pages: {
    p01: {
      kicker: "數字",
      title: "你的位置在哪裡",
      lede: "對照訓練資料中的平均輪廓。這些是位置，不是要追的分數。",
      railNote: "刻度左邊是低於平均，右邊是高於平均。教練收到的是區間，不是原始數值。",
      scaleTitle: "加起來是這樣的",
      scaleCaption: (line) => `虛線落在 ${line}% — 過了這條線，模型就由「穩定」改判為「有風險」。`,
      scaleLow: "極低",
      scaleHigh: "高",
      tierNote: "等級只反映成績風險，不是對你狀態的評價。",
    },
    p02: {
      kicker: "你的模式",
      caption: "它描述的是這一週的形狀 — 不是你這個人。",
    },
    p03: { kicker: "這代表什麼", fallbackTitle: "讀一讀你的模式" },
    p04: { kicker: "初步解讀", fallbackTitle: "這個模式可能在說甚麼" },
    p05: { kicker: "三個行動", fallbackTitle: "接下來這一週" },
    p06: { kicker: "你的一週" },
    p07: {
      kicker: "技術細節",
      title: "z 分數是甚麼",
      lede: "z 分數是一個位置，不是一個分數。它計算你距離訓練資料中的平均學生有幾個標準差 — 零是平均，正負號說明你在哪一邊。",
      unit: "z",
      axisLow: "低於平均",
      axisMid: "平均",
      axisHigh: "高於平均",
      note: "這三項是離平均最遠的輸入。它們不是權重，也不會相加 — 模型是同時看這八項資料的。",
    },
    p08: {
      kicker: "細節",
      title: "這是甚麼 — 不是甚麼",
      isTitle: "這是",
      isNotTitle: "這不是",
      is: [
        "對你輸入的八項結構化資料的反映",
        "為你而寫的參考性指導",
        "一個讓你停一停、看看自己的理由",
      ],
      isNot: [
        "學業指導，亦不能取代學業指導",
        "心理輔導",
        "診斷或醫療建議",
        "對你精神健康的評估",
        "關於你學業身分的決定",
        "紀錄 — 你輸入的內容不會被儲存",
      ],
      supportTitle: "想找真人談談",
      supportBody:
        "香港大學 CEDARS（輔導及個人發展中心）接受學生直接求助，無需轉介。如有即時危險，請聯絡緊急服務。",
      again: "再測一次",
      close: "關閉",
    },
  },

  tiers: {
    "Very Low":
      "訓練資料裡，相近的組合十次有七次以上最終拿到 A 或 B。這裡沒有需要修補的地方 — 真正有用的是把這一週維持下去。",
    Low: "相近的組合多數最終拿到 A 或 B。直白地說：你想拿到的成績仍然守得住 — 這是值得保護的模式，不是要修理的問題。",
    Moderate:
      "接近一半一半。相近的組合在 A–B 與 C–F 之間大致平均分佈 — 也就是說，這一週的小改動，在這裡比在兩端更有作用。",
    High: "相近的組合四次有三次最終落在 C 至 F。這是改變這一週形狀的理由，不是對你能力的判斷。",
  },

  crisis: {
    bannerTitle: "這些輸入指向一段吃力的時期",
    bannerBody: "如果覺得超出負荷，香港大學 CEDARS 可以幫你，無需轉介。",
    tierNote: "等級只是一個成績風險數字。上面的提示是另一項關於這一週有多吃力的檢查，優先於這個數字。",
  },

  fallback: {
    unavailable: "暫時未能連接教練，以下為標準指引。",
    empty: "教練這次沒有回覆。你的數字與支援頁仍然在這裡。",
  },

  archetypes: {
    night_shift: {
      name: "夜戰型",
      oneLine: "你睡得少、讀得多，於是每一天都比前一天更晚開始。",
      drivers: ["睡眠低於平均", "讀書時間高於平均"],
    },
    pressure: {
      name: "高壓型",
      oneLine: "此刻壓力佔的份量最重，而最先讓位的，是休息。",
      drivers: ["壓力高於平均", "睡眠低於平均"],
    },
    drift: {
      name: "漂移型",
      oneLine: "出席與睡眠同時鬆動，一週開始沒有可靠的形狀。",
      drivers: ["出席低於平均", "睡眠低於平均"],
    },
    double_shift: {
      name: "雙班型",
      oneLine: "工作與學業在同一批小時裡拉扯，總有一邊在落後。",
      drivers: ["兼職呈明顯訊號", "讀書時間高於平均"],
    },
    sprint: {
      name: "衝刺型",
      oneLine: "考試就在眼前，所有事都被擠進接下來這幾週。",
      drivers: ["考試臨近", "壓力高於平均"],
    },
    grind: {
      name: "長跑型",
      oneLine: "你投入的時間長而穩定，支撐它的節奏也還完整。",
      drivers: ["讀書時間遠高於平均", "壓力約在平均或以下"],
    },
    recovery: {
      name: "回復型",
      oneLine: "睡眠與壓力都落在區間裡較健康的一半。",
      drivers: ["睡眠高於平均", "壓力低於平均"],
    },
    balanced: {
      name: "平衡型",
      oneLine: "課外有東西把你穩住，學業則落在中段。",
      drivers: ["課外活動屬保護性", "讀書時間接近平均"],
    },
    routine: {
      name: "規律型",
      oneLine: "出席穩定，一週有形狀，你可以預期。",
      drivers: ["出席高於平均", "壓力接近平均"],
    },
    open: {
      name: "未完待續",
      oneLine: "你的輸入裡沒有哪一項在搶著發言 — 這一週的形狀，仍然由你來定。",
      drivers: ["摘要中未見主導訊號"],
    },
  },

  headings: {
    means: "這代表什麼",
    read: "初步解讀",
    moves: "三個行動",
    week: "你的一週",
  },
};

const zhHans = {
  chrome: {
    pageOf: (i, n) => `${String(i).padStart(2, "0")} / ${String(n).padStart(2, "0")}`,
    pageLabel: (i, n) => `第 ${i} 页，共 ${n} 页`,
    close: "关闭",
    previous: "上一页",
    next: "下一页",
    nextShort: "下一页",
    infoOnly: "仅供参考的学业指导 — 并非诊断，亦非辅导。",
    cedars: "CEDARS",
    fullDisclaimer: "完整声明",
    swipe: "可滑动或使用方向键",
  },

  intro: {
    kicker: "你的检查",
    words: ["你的", "结果"],
    sub: "七页，读自你输入的八项数据。不会留下任何记录。",
    skip: "点任何位置即可跳过",
  },

  labels: {
    Study_Hours_Per_Day: "学习",
    Sleep_Hours_Per_Day: "睡眠",
    Stress_Level: "压力",
    Attendance_Rate: "出勤",
    Age: "年龄",
    Extracurricular_Activities: "课外活动",
    Exam_Proximity: "考试时间",
    Part_Time_Job: "兼职",
  },

  bands: {
    farBelow: "远低于平均",
    below: "低于平均",
    onPar: "接近平均",
    above: "高于平均",
    farAbove: "远高于平均",
  },

  signals: {
    protective: "保护性",
    mild: "轻微信号",
    moderate: "中等信号",
    strong: "明显信号",
    neutral: "无明显信号",
  },

  pages: {
    p01: {
      kicker: "数字",
      title: "你的位置在哪里",
      lede: "对照训练数据中的平均轮廓。这些是位置，不是要追的分数。",
      railNote: "刻度左边是低于平均，右边是高于平均。教练收到的是区间，不是原始数值。",
      scaleTitle: "加起来是这样的",
      scaleCaption: (line) => `虚线落在 ${line}% — 过了这条线，模型就从「稳定」改判为「有风险」。`,
      scaleLow: "极低",
      scaleHigh: "高",
      tierNote: "等级只反映成绩风险，不是对你状态的评价。",
    },
    p02: {
      kicker: "你的模式",
      caption: "它描述的是这一周的形状 — 不是你这个人。",
    },
    p03: { kicker: "这代表什么", fallbackTitle: "读一读你的模式" },
    p04: { kicker: "初步解读", fallbackTitle: "这个模式可能在说什么" },
    p05: { kicker: "三个行动", fallbackTitle: "接下来这一周" },
    p06: { kicker: "你的一周" },
    p07: {
      kicker: "技术细节",
      title: "z 分数是什么",
      lede: "z 分数是一个位置，不是一个分数。它计算你距离训练数据中的平均学生有几个标准差 — 零是平均，正负号说明你在哪一边。",
      unit: "z",
      axisLow: "低于平均",
      axisMid: "平均",
      axisHigh: "高于平均",
      note: "这三项是离平均最远的输入。它们不是权重，也不会相加 — 模型是同时看这八项数据的。",
    },
    p08: {
      kicker: "细节",
      title: "这是什么 — 不是什么",
      isTitle: "这是",
      isNotTitle: "这不是",
      is: [
        "对你输入的八项结构化数据的反映",
        "为你而写的参考性指导",
        "一个让你停一停、看看自己的理由",
      ],
      isNot: [
        "学业指导，亦不能取代学业指导",
        "心理辅导",
        "诊断或医疗建议",
        "对你心理健康的评估",
        "关于你学业身份的决定",
        "记录 — 你输入的内容不会被保存",
      ],
      supportTitle: "想找真人聊聊",
      supportBody:
        "香港大学 CEDARS（辅导及个人发展中心）接受学生直接求助，无需转介。如有即时危险，请联系紧急服务。",
      again: "再测一次",
      close: "关闭",
    },
  },

  tiers: {
    "Very Low":
      "训练数据里，相近的组合十次有七次以上最终拿到 A 或 B。这里没有需要修补的地方 — 真正有用的是把这一周维持下去。",
    Low: "相近的组合多数最终拿到 A 或 B。直白地说：你想拿到的成绩仍然守得住 — 这是值得保护的模式，不是要修理的问题。",
    Moderate:
      "接近一半一半。相近的组合在 A–B 与 C–F 之间大致平均分布 — 也就是说，这一周的小改动，在这里比在两端更有作用。",
    High: "相近的组合四次有三次最终落在 C 至 F。这是改变这一周形状的理由，不是对你能力的判断。",
  },

  crisis: {
    bannerTitle: "这些输入指向一段吃力的时期",
    bannerBody: "如果觉得超出负荷，香港大学 CEDARS 可以帮你，无需转介。",
    tierNote: "等级只是一个成绩风险数字。上面的提示是另一项关于这一周有多吃力的检查，优先于这个数字。",
  },

  fallback: {
    unavailable: "暂时未能连接教练，以下为标准指引。",
    empty: "教练这次没有回复。你的数字与支持页仍然在这里。",
  },

  archetypes: {
    night_shift: {
      name: "夜战型",
      oneLine: "你睡得少、学得多，于是每一天都比前一天更晚开始。",
      drivers: ["睡眠低于平均", "学习时间高于平均"],
    },
    pressure: {
      name: "高压型",
      oneLine: "这一刻压力占的份量最重，而最先让位的，是休息。",
      drivers: ["压力高于平均", "睡眠低于平均"],
    },
    drift: {
      name: "漂移型",
      oneLine: "出勤与睡眠同时松动，一周开始没有可靠的形状。",
      drivers: ["出勤低于平均", "睡眠低于平均"],
    },
    double_shift: {
      name: "双班型",
      oneLine: "工作与学业在同一批小时里拉扯，总有一边在落后。",
      drivers: ["兼职呈明显信号", "学习时间高于平均"],
    },
    sprint: {
      name: "冲刺型",
      oneLine: "考试就在眼前，所有事都被挤进接下来这几周。",
      drivers: ["考试临近", "压力高于平均"],
    },
    grind: {
      name: "长跑型",
      oneLine: "你投入的时间长而稳定，支撑它的节奏也还完整。",
      drivers: ["学习时间远高于平均", "压力约在平均或以下"],
    },
    recovery: {
      name: "回复型",
      oneLine: "睡眠与压力都落在区间里较健康的一半。",
      drivers: ["睡眠高于平均", "压力低于平均"],
    },
    balanced: {
      name: "平衡型",
      oneLine: "课外有东西把你稳住，学业则落在中段。",
      drivers: ["课外活动属保护性", "学习时间接近平均"],
    },
    routine: {
      name: "规律型",
      oneLine: "出勤稳定，一周有形状，你可以预期。",
      drivers: ["出勤高于平均", "压力接近平均"],
    },
    open: {
      name: "未完待续",
      oneLine: "你的输入里没有哪一项在抢着发言 — 这一周的形状，仍然由你来定。",
      drivers: ["摘要中未见主导信号"],
    },
  },

  headings: {
    means: "这代表什么",
    read: "初步解读",
    moves: "三个行动",
    week: "你的一周",
  },
};

export const DECK_COPY = { en, "zh-Hant": zhHant, "zh-Hans": zhHans };

export function getDeckCopy(language) {
  return DECK_COPY[language] || DECK_COPY.en;
}
