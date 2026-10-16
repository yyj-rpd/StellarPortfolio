import type { Profile, Skill, Project, Post } from '../types/content';

// 用户提供的真实展示内容，暂由本地只读适配器读取，并未接入数据库。
// 未提供的时间与链接保留 null，绝不由示例值推断。
const base = { status: 'published' as const, createdAt: null, updatedAt: null };

export const profile: Profile = {
  id: 1,
  status: 'published',
  displayName: 'Yan Jia',
  headline: '大连海事大学 · 计算机科学与技术本科',
  researchSummary: '关注机器学习与 AI for Science，喜欢把算法、科研思考和工程实践结合起来。',
  bio: '你好，我是一名计算机科学与技术专业的学生，关注机器学习与 AI for Science。喜欢将算法、科研思考和工程实践结合起来，探索人工智能解决真实问题的可能性。',
  researchInterests: ['Machine Learning', 'AI for Science', 'Deep Learning', 'Machine Learning Applications'],
  education: [{
    school: '大连海事大学',
    degree: '计算机科学与技术 · 本科',
    start: null,
    end: null,
    description: '',
  }],
  experiences: [],
  email: null,
  githubUrl: 'https://github.com/yyj-rpd',
};

export const skills: Skill[] = [
  { ...base, id: 's1', name: 'Python', category: 'language', description: '数据分析与机器学习建模', sortOrder: 0 },
  { ...base, id: 's2', name: 'C++', category: 'language', description: '', sortOrder: 1 },
  { ...base, id: 's3', name: 'JavaScript', category: 'language', description: '', sortOrder: 2 },
  { ...base, id: 's4', name: 'TypeScript', category: 'language', description: '', sortOrder: 3 },
  { ...base, id: 's5', name: 'TensorFlow', category: 'ml', description: '深度学习模型训练', sortOrder: 4 },
  { ...base, id: 's6', name: 'MobileNetV2', category: 'ml', description: '轻量化图像分类', sortOrder: 5 },
  { ...base, id: 's7', name: 'LightGBM', category: 'ml', description: '港口等待预测建模', sortOrder: 6 },
  { ...base, id: 's8', name: 'KMeans', category: 'ml', description: '船型聚类', sortOrder: 7 },
  { ...base, id: 's9', name: '特征工程', category: 'ml', description: '真实场景数据建模', sortOrder: 8 },
  { ...base, id: 's10', name: 'Git', category: 'tool', description: '版本管理', sortOrder: 9 },
  { ...base, id: 's11', name: 'GitHub', category: 'tool', description: '代码托管', sortOrder: 10 },
  { ...base, id: 's12', name: 'React', category: 'tool', description: 'Web 界面开发', sortOrder: 11 },
  { ...base, id: 's13', name: 'HTML / CSS', category: 'tool', description: '页面结构与样式', sortOrder: 12 },
  { ...base, id: 's14', name: 'MySQL', category: 'tool', description: '关系数据存储', sortOrder: 13 },
];

export const projects: Project[] = [
  {
    ...base,
    id: 'butterfly-recognition',
    title: '观蝶小筑',
    summary: '基于 MobileNetV2 的蝴蝶图像识别系统，结合微信小程序提供识别、科普与交互功能。',
    kind: 'development',
    categoryLabel: '计算机视觉与应用开发',
    role: '项目负责人',
    result: '实际测试分类准确率约 91%',
    details: [
      '使用 Python 与 TensorFlow 训练 MobileNetV2 轻量化图像分类模型，并结合 MySQL 与微信小程序完成系统开发。',
      '作为项目负责人，参与模型训练、参数调优以及系统开发，将图像分类能力连接到小程序中的识别、科普和交互流程。',
      '系统在实际测试中获得约 91% 的分类准确率；该结果描述项目测试表现，不推断为其他数据集或使用场景的指标。',
    ],
    techStack: ['Python', 'TensorFlow', 'MobileNetV2', 'MySQL', '微信小程序'],
    coverUrl: '/images/butterfly.svg',
    githubUrl: null,
    detailUrl: null,
    sortOrder: 0,
  },
  {
    ...base,
    id: 'port-vessel-waiting',
    title: '港口船舶等泊时长预测',
    summary: '基于真实港口作业数据构建两阶段预测方案，结合船型聚类、天气与港口拥堵特征，面向实际作业场景分析船舶等待情况。',
    kind: 'development',
    categoryLabel: '机器学习与工业场景应用',
    role: null,
    result: null,
    details: [
      '围绕真实港口作业数据开展数据处理与分析，将作业信息组织为面向船舶等待预测的模型输入。',
      '采用两阶段方案：第一阶段判断船舶是否直靠，第二阶段针对非直靠船舶进行等待时长分类。',
      '结合 KMeans 船型聚类、天气与港口拥堵特征开展特征工程，并使用 LightGBM 进行机器学习建模与模型选择。',
      '关注模型输入与实际港口作业场景的联系，为理解船舶等待情况和辅助作业分析提供参考。',
    ],
    techStack: ['Python', 'LightGBM', 'KMeans', '特征工程'],
    coverUrl: '/images/harbor.svg',
    githubUrl: null,
    detailUrl: null,
    sortOrder: 1,
  },
];

export const posts: Post[] = [
  {
    ...base,
    id: 'ai-md-water-treatment',
    contentType: 'publication',
    title: 'Artificial Intelligence-Enhanced Molecular Dynamics Simulations in Water Treatment',
    slug: 'ai-enhanced-molecular-dynamics-water-treatment',
    excerpt: '该综述讨论人工智能增强分子动力学模拟在水处理中的研究进展，涉及机器学习力场、分子性质预测、多尺度建模、工作流自动化，以及相关方法在材料设计、机理分析和性能预测中的应用。',
    tags: ['AI for Science', 'Molecular Dynamics', 'Water Treatment'],
    publishedAt: null,
    publication: {
      journal: 'Environmental Research',
      articleType: 'Review Article（综述论文）',
      authorRole: '独立第一作者',
      publicationStatus: '已发表',
      publicationDate: null,
      doi: null,
      url: null,
    },
    contentMarkdown: [
      '## 论文简介',
      '本综述系统梳理人工智能增强分子动力学模拟在水处理领域的研究进展，关注机器学习方法如何与分子模拟相结合，以及这些方法在水处理研究中的应用。',
      '## 研究背景',
      '水处理材料设计和作用机理研究涉及对分子性质、相互作用及材料性能的理解。本文围绕人工智能与分子动力学模拟的结合展开综述，整理相关研究路径、应用方向与方法进展。',
      '## 主要研究内容',
      '- **机器学习力场**：梳理机器学习力场与分子动力学模拟结合的研究进展。\n- **分子性质预测**：讨论机器学习辅助分子性质预测的方法及相关应用。\n- **多尺度建模**：总结面向水处理问题的多尺度建模研究。\n- **工作流自动化**：梳理人工智能支持模拟工作流自动化的研究方向。\n- **水处理应用**：归纳相关方法在材料设计、作用机理分析、方法优化与性能预测中的应用。',
      '## 个人贡献',
      '作为独立第一作者，系统梳理相关研究进展，归纳人工智能增强分子动力学模拟的主要方法，并总结其在水处理研究中的应用方向。',
    ].join('\n\n'),
  },
];

