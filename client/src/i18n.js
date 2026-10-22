/**
 * i18n.js — Lightweight translation dictionary for the three supported locales:
 *   en       English
 *   zh-Hant  Traditional Chinese (Hong Kong)
 *   zh-Hans  Simplified Chinese
 *
 * No external dependency. Add keys here and use `t.<key>` in components.
 */

export const SUPPORTED_LOCALES = ["en", "zh-Hant", "zh-Hans"];

export const LOCALE_LABELS = {
  en: { short: "EN", full: "English" },
  "zh-Hant": { short: "繁中", full: "繁體中文（香港）" },
  "zh-Hans": { short: "简中", full: "简体中文" },
};

export const translations = {
  en: {
    title: "Student Risk Predictor",
    subtitle:
      "Informational academic coaching based on your structured lifestyle and study inputs.",

    disclaimerTitle: "Disclaimer:",
    disclaimerBody:
      "This tool provides informational academic coaching only. It does not replace academic advising or psychological counselling, does not diagnose, does not assess mental health, does not store your personal data, and does not make decisions about your academic standing.",
    disclaimerCrisis: "If you are in distress, contact",
    disclaimerCedars: "CEDARS",
    disclaimerEmergency:
      "or your campus support line. If you are in immediate danger, contact emergency services.",

    loadingForm: "Loading form…",
    submit: "Get Advice",
    submitLoading: "Analysing...",
    range: "range",

    railKicker: "The University of Hong Kong",
    railHeading: "Start your check-in",
    railStep1: "Fill in the form on the right — it takes under a minute.",
    railStep2: "Our model reads your numbers and checks them instantly.",
    railStep3: "You get simple, friendly coaching advice based on the result.",
    railPrivate: "Private by design",
    railSupport: "Need support?",
    railFoot: "HKU · CEDARS · Student Wellbeing",

    options: { Yes: "Yes", No: "No" },

    errors: {
      required: "This field is required.",
      notNumber: "Please enter a number.",
      outOfRange: (min, max) => `Please enter a value between ${min} and ${max}.`,
      notInteger: "Please enter a whole number.",
      summary: (count) =>
        `${count} field${count > 1 ? "s" : ""} need${
          count > 1 ? "" : "s"
        } attention before the analysis can run.`,
    },
    infoLabel: (name) => `About: ${name}`,

    info: {
      Study_Hours_Per_Day:
        "Hours you spend studying on a typical day. Example: 3 means about three hours of revision daily.",
      Sleep_Hours_Per_Day:
        "Hours of sleep on a typical night. 7–9 is the usual healthy range for students.",
      Stress_Level:
        "How stressed you feel day to day, from 0 (fully calm) to 10 (overwhelmed).",
      Attendance_Rate:
        "Percentage of classes you actually attend. 85 means you miss roughly 1 in 7.",
      Age: "Your age in years.",
      Extracurricular_Activities:
        "Are you in any clubs, sports teams, or societies outside class?",
      Exam_Proximity:
        "Is an important exam coming up soon (within the next few weeks)?",
      Part_Time_Job:
        "Do you currently work a part-time job alongside your studies?",
    },

    loadingTitle: "Analysing your profile…",
    loadingSub: "This may take up to 30 seconds.",
    resultTitle: "Your check-in result",
    viewAdvice: "View advice",
    closeResult: "Close result",

    keyFactors: "Key factors",
    zBands: "Numeric z-score bands",
    advice: "Advice",
    crisisBanner:
      "High-stress pattern detected. Please reach out to CEDARS or your campus support service.",
    fallbackNote:
      "Live LLM advice was unavailable; showing safe fallback advice.",

    tierVeryLow: "Very Low risk",
    tierLow: "Low risk",
    tierModerate: "Moderate risk",
    tierHigh: "High risk",
    probability: "probability",

    fields: {
      Study_Hours_Per_Day: "Study Hours Per Day",
      Sleep_Hours_Per_Day: "Sleep Hours Per Day",
      Stress_Level: "Stress Level",
      Attendance_Rate: "Attendance Rate",
      Age: "Age",
      Extracurricular_Activities: "Extracurricular Activities",
      Exam_Proximity: "Exam Proximity",
      Part_Time_Job: "Part-Time Job",
    },
  },

  "zh-Hant": {
    title: "學生風險預測器",
    subtitle: "根據你的生活模式與學習輸入，提供學術指導資訊。",

    disclaimerTitle: "聲明：",
    disclaimerBody:
      "本工具只提供學術指導資訊，不能取代學術諮詢或心理輔導，不會進行診斷，不會評估精神健康，不會儲存你的個人資料，亦不會就你的學術狀況作出決定。",
    disclaimerCrisis: "如你感到困擾，請聯絡",
    disclaimerCedars: "CEDARS",
    disclaimerEmergency:
      "或你的校園支援熱線。如你身處即時危險，請聯絡緊急服務。",

    loadingForm: "載入表單中…",
    submit: "取得建議",
    submitLoading: "分析中...",
    range: "範圍",

    railKicker: "香港大學",
    railHeading: "開始你的檢查",
    railStep1: "在右邊填寫表格，一分鐘內即可完成。",
    railStep2: "我們的模型會即時讀取並分析你的數據。",
    railStep3: "你會根據結果獲得簡單、親切的指導建議。",
    railPrivate: "設計上保護私隱",
    railSupport: "需要支援？",
    railFoot: "HKU · CEDARS · 學生身心健康",

    options: { Yes: "是", No: "否" },

    errors: {
      required: "此欄為必填。",
      notNumber: "請輸入數字。",
      outOfRange: (min, max) => `請輸入 ${min} 至 ${max} 之間的數值。`,
      notInteger: "請輸入整數。",
      summary: (count) =>
        `有 ${count} 個欄位需要處理，才能開始分析。`,
    },
    infoLabel: (name) => `關於：${name}`,

    info: {
      Study_Hours_Per_Day:
        "你平日每天用於學習的時數。例如：3 代表每天約三小時溫習。",
      Sleep_Hours_Per_Day:
        "你一般每晚的睡眠時數。對學生而言，7–9 小時是常見的健康範圍。",
      Stress_Level:
        "你日常感受到的壓力，由 0（完全平靜）至 10（不勝負荷）。",
      Attendance_Rate:
        "你實際出席課堂的百分比。85 代表大約每七堂缺席一堂。",
      Age: "你的年齡（歲）。",
      Extracurricular_Activities:
        "你是否有參加課堂以外的學會、運動隊或社團？",
      Exam_Proximity: "短期內（未來數週）是否有重要考試？",
      Part_Time_Job: "你目前是否有在學業以外從事兼職工作？",
    },

    loadingTitle: "正在分析你的資料…",
    loadingSub: "可能需要最多 30 秒。",
    resultTitle: "你的檢查結果",
    viewAdvice: "查看建議",
    closeResult: "關閉結果",

    keyFactors: "主要因素",
    zBands: "數值 z 分數區間",
    advice: "建議",
    crisisBanner:
      "偵測到高壓力模式。請聯絡 CEDARS 或你的校園支援服務。",
    fallbackNote: "即時 LLM 建議未能提供；以下為安全備用建議。",

    tierVeryLow: "極低風險",
    tierLow: "低風險",
    tierModerate: "中風險",
    tierHigh: "高風險",
    probability: "概率",

    fields: {
      Study_Hours_Per_Day: "每日學習時數",
      Sleep_Hours_Per_Day: "每日睡眠時數",
      Stress_Level: "壓力水平",
      Attendance_Rate: "出席率",
      Age: "年齡",
      Extracurricular_Activities: "課外活動",
      Exam_Proximity: "考試臨近程度",
      Part_Time_Job: "兼職工作",
    },
  },

  "zh-Hans": {
    title: "学生风险预测器",
    subtitle: "基于您的结构化生活方式和学习输入，提供学术辅导信息。",

    disclaimerTitle: "声明：",
    disclaimerBody:
      "本工具仅提供学术辅导信息，不能代替学术咨询或心理咨询，不进行诊断，不评估心理健康，不存储您的个人数据，也不对您的学业状况做出决定。",
    disclaimerCrisis: "如果您感到困扰，请联系",
    disclaimerCedars: "CEDARS",
    disclaimerEmergency:
      "或您所在校园的支持热线。如果您处于紧急危险中，请联系紧急服务。",

    loadingForm: "正在加载表单…",
    submit: "获取建议",
    submitLoading: "分析中...",
    range: "范围",

    railKicker: "香港大学",
    railHeading: "开始你的检查",
    railStep1: "在右边填写表格，一分钟内即可完成。",
    railStep2: "我们的模型会即时读取并分析你的数据。",
    railStep3: "你会根据结果获得简单、友好的辅导建议。",
    railPrivate: "设计上保护隐私",
    railSupport: "需要支持？",
    railFoot: "HKU · CEDARS · 学生身心健康",

    options: { Yes: "是", No: "否" },

    errors: {
      required: "此项为必填。",
      notNumber: "请输入数字。",
      outOfRange: (min, max) => `请输入 ${min} 至 ${max} 之间的数值。`,
      notInteger: "请输入整数。",
      summary: (count) => `有 ${count} 个字段需要处理，才能开始分析。`,
    },
    infoLabel: (name) => `关于：${name}`,

    info: {
      Study_Hours_Per_Day:
        "你平日每天用于学习的小时数。例如：3 代表每天约三小时复习。",
      Sleep_Hours_Per_Day:
        "你通常每晚的睡眠时数。对学生而言，7–9 小时是常见的健康范围。",
      Stress_Level:
        "你日常感受到的压力，从 0（完全平静）到 10（不堪重负）。",
      Attendance_Rate:
        "你实际出席课堂的百分比。85 代表大约每七节课缺席一节。",
      Age: "你的年龄（岁）。",
      Extracurricular_Activities:
        "你是否有参加课外社团、运动队或学会？",
      Exam_Proximity: "近期（未来几周）是否有重要考试？",
      Part_Time_Job: "你目前是否在学业之外从事兼职工作？",
    },

    loadingTitle: "正在分析您的资料…",
    loadingSub: "这可能需要最多 30 秒。",
    resultTitle: "您的检查结果",
    viewAdvice: "查看建议",
    closeResult: "关闭结果",

    keyFactors: "主要因素",
    zBands: "数值 z 分数区间",
    advice: "建议",
    crisisBanner:
      "检测到高压力模式。请联系 CEDARS 或您所在校园的支持服务。",
    fallbackNote: "实时 LLM 建议不可用；显示安全备用建议。",

    tierVeryLow: "极低风险",
    tierLow: "低风险",
    tierModerate: "中风险",
    tierHigh: "高风险",
    probability: "概率",

    fields: {
      Study_Hours_Per_Day: "每日学习时长",
      Sleep_Hours_Per_Day: "每日睡眠时长",
      Stress_Level: "压力水平",
      Attendance_Rate: "出勤率",
      Age: "年龄",
      Extracurricular_Activities: "课外活动",
      Exam_Proximity: "考试临近程度",
      Part_Time_Job: "兼职工作",
    },
  },
};

export function getTranslations(locale) {
  return translations[locale] || translations.en;
}
