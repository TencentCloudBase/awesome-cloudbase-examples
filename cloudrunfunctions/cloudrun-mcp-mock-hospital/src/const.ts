export const DOCTORS = [
  {
    name: "张三",
    title: "主任医师",
    department: "内科",
    description: "擅长治疗感冒发烧",
    available: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
  },
  {
    name: "李四",
    title: "副主任医师",
    department: "外科",
    description: "擅长微创手术",
    available: ["monday", "wednesday", "friday"],
  },
  {
    name: "王五",
    title: "主治医师",
    department: "儿科",
    description: "儿童常见病专家",
    available: ["tuesday", "thursday", "saturday"],
  },
  {
    name: "赵六",
    title: "主任医师",
    department: "骨科",
    description: "骨折修复专家",
    available: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  },
  {
    name: "钱七",
    title: "副主任医师",
    department: "眼科",
    description: "白内障手术专家",
    available: ["wednesday", "friday", "sunday"],
  },
  {
    name: "孙八",
    title: "主治医师",
    department: "皮肤科",
    description: "皮肤病治疗专家",
    available: ["monday", "tuesday", "thursday", "saturday"],
  },
  {
    name: "周九",
    title: "主任医师",
    department: "神经内科",
    description: "脑卒中治疗专家",
    available: ["tuesday", "wednesday", "friday", "sunday"],
  },
  {
    name: "吴十",
    title: "副主任医师",
    department: "心血管科",
    description: "心脏介入治疗专家",
    available: ["monday", "wednesday", "friday"],
  },
  {
    name: "郑十一",
    title: "主治医师",
    department: "消化内科",
    description: "胃肠疾病专家",
    available: ["tuesday", "thursday", "saturday"],
  },
  {
    name: "王十二",
    title: "主任医师",
    department: "呼吸科",
    description: "呼吸系统疾病专家",
    available: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ],
  },
];

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const DEPARTMENTS = [
  "内科",
  "外科",
  "儿科",
  "骨科",
  "眼科",
  "皮肤科",
  "神经内科",
  "心血管科",
  "消化内科",
  "呼吸科",
] as const;
