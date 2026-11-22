---
title: "关系图谱"
summary: "实体关系图谱，用「主体—谓词→客体」记录有向关系并标注证据强度，另有三条反直觉结论：放弃专利换来标准，工会妥协换来港口崛起。"
status: active
tags: ["索引"]
aliases: ["关系图", "关系表"]
---
# 关系图谱

本页把来源中的实体关系显式化。每条关系格式为 `主体 —谓词→ 客体`，标注证据强度。

**证据强度图例**：★★★ 来源明确陈述 / ★★ 来源隐含，可合理推出 / ★ 本 Wiki 补充（来源未提，属常识补全，需核实）

---

## 一、人物 → 组织

| 主体 | 谓词 | 客体 | 强度 |
|---|---|---|---|
| [[people/malcolm-mclean]] | 创立 | [[orgs/mclean-trucking]] | ★★★ |
| 麦克莱恩 | 出售（1955，约 600 万美元） | 麦克莱恩卡车运输公司 | ★★★ |
| 麦克莱恩 | 收购（1955，700 万美元） | [[orgs/pan-atlantic]] | ★★★ |
| 麦克莱恩 | 控制 | [[orgs/sea-land]] | ★★★ |
| [[people/keith-tantlinger]] | 任职（总工程师） | 海陆公司 | ★★★ |
| [[people/harry-bridges]] | 领导 | 西海岸码头工会 | ★★★ |
| 麦克莱恩 | 与五角大楼交易 | 美军越战后勤 | ★★★ |

## 二、人物 → 概念

| 主体 | 谓词 | 客体 | 强度 |
|---|---|---|---|
| [[people/ronald-coase]] | 提出 | [[concepts/transaction-cost]] | ★★★ |
| [[people/david-ricardo]] | 提出 | [[concepts/comparative-advantage]] | ★★★ |
| [[people/marc-levinson]] | 测算 | [[concepts/break-bulk-shipping]] | ★★★ |
| 麦克莱恩 | 构想 | [[concepts/door-to-door]] | ★★★ |
| 坦特林格 | 发明 | [[artifacts/corner-casting]] | ★★★ |

## 三、人物 → 人物

| 主体 | 谓词 | 客体 | 强度 |
|---|---|---|---|
| 坦特林格 | 说服（放弃专利，1965） | 麦克莱恩 | ★★★ |
| 麦克莱恩 | 对立（标准谈判） | 美森轮船代表（未具名） | ★★★ |
| 布里奇斯 | 路线对立 | 纽约港工会（未具名） | ★★ |

## 四、组织 → 标准 / 事件

| 主体 | 谓词 | 客体 | 强度 |
|---|---|---|---|
| [[orgs/asa]] | 发起（1958） | [[hub/timeline|尺寸标准大战]] | ★★★ |
| [[orgs/iso]] | 确立（1960s 中） | 全球集装箱标准 | ★★★ |
| ISO | 讨论（1965） | [[artifacts/corner-casting]] | ★★★ |
| [[orgs/sea-land]] | 采用 | 35 英尺箱 | ★★★ |
| [[orgs/matson]] | 采用 | 24 英尺箱 | ★★★ |
| 海陆公司 | 放弃专利 | [[artifacts/corner-casting]] | ★★★ |
| 布里奇斯 / 西海岸工会 | 签署（1960） | [[hub/timeline|机械化与现代化协议]] | ★★★ |
| 泛大西洋 → 海陆 | 疑似更名继承 | 同一实体 | ★ |
| 西海岸工会 = ILWU | 名称对应 | — | ★ |
| 纽约港工会 = ILA | 名称对应 | — | ★ |

## 五、技术物 → 能力

| 主体 | 谓词 | 客体 | 强度 |
|---|---|---|---|
| [[artifacts/corner-casting]] | 使能 | 起重机吊装 | ★★★ |
| 角件 | 使能 | 多层堆叠、抗风浪 | ★★★ |
| 角件专利公开 | 消除 | 全球推广的最后技术壁垒 | ★★★ |
| [[artifacts/standard-container]] | 使能 | [[concepts/door-to-door]] | ★★★ |
| 标准集装箱 | 充当 | 移动仓库 | ★★★ |
| [[artifacts/ideal-x]] | 验证 | 集装箱商业可行性 | ★★★ |
| [[artifacts/ever-given]] | 暴露 | 单点故障的全局影响 | ★★★ |

## 六、概念 → 概念（核心推理链）

```
[件杂货运输](concept-break-bulk-shipping.md)
   —导致→ 交易成本极高（[交易成本](concept-transaction-cost.md)）
   —阻碍→ [比较优势](concept-comparative-advantage.md) 无法兑现
   —被取代于→ [集装箱化](containerization.md)

[集装箱化](containerization.md)
   —要求→ [标准化](concept-standardization.md)（尺寸 + 接口）
   —实现→ [门到门运输](concept-door-to-door-transport.md)
   —释放→ [规模经济](concept-economies-of-scale.md)
   —释放→ [网络外部性](concept-network-externality.md)
   —使能→ [精益生产](concept-lean-production.md) / [零库存](concept-zero-inventory.md)
   —代价→ [供应链韧性](concept-supply-chain-resilience.md) 下降

[标准化](concept-standardization.md)
   —消除→ 接口转换成本（[交易成本](concept-transaction-cost.md) 的一种）

[规模经济](concept-economies-of-scale.md)
   —降低→ 单位运费
   —迫使→ [港口深水化](timeline.md)
   —使能→ 远距离分工（[比较优势](concept-comparative-advantage.md)）

[网络外部性](concept-network-externality.md)
   —锁定→ 产业集群
   —来源→ [规模经济](concept-economies-of-scale.md) 强化
   —冲突→ [供应链韧性](concept-supply-chain-resilience.md)（集中度↑ 则韧性↓）
```

## 七、实体类型分布

| 类型 | 数量 | 页面 |
|---|---|---|
| person | 6 | 麦克莱恩、坦特林格、布里奇斯、科斯、莱文森、李嘉图 |
| organization | 7 | 海陆、美森、泛大西洋、麦克莱恩卡车、ISO、ASA、码头工会、航运企业 |
| vessel | 2 | 理想 X 号、长赐号 |
| artifact | 2 | 角件、标准集装箱 |
| place | 1（合并索引） | 港口与航道 |
| concept | 9 | 交易成本、标准化、规模经济、网络外部性、比较优势、精益生产、供应链韧性、件杂货运输、门到门运输 |
| event | 10（合并索引） | 见[[hub/timeline]] |

## 八、值得注意的三条反直觉关系

1. **放弃专利 → 获得全球市场**：坦特林格让麦克莱恩放弃角件专利，短期损失专利收益，长期换来标准采纳与网络扩张。这是「接口必须公共化」的经典案例。

2. **工会妥协 → 港口崛起**：看似让步的西海岸工会（放行集装箱 + 换取补偿基金）换来洛杉矶/长滩的百年繁荣；死扛的纽约工会保住了短期岗位，却让整个码头荒废。「保住岗位」与「保住产业」在此分道扬镳。

3. **效率提升 → 韧性下降**：规模经济与网络外部性把成本压到极致，同时把系统的冗余压到极致，最终由[[artifacts/ever-given|长赐号]]与疫情两次事件反向收账。

## 相关页面

- [[hub/timeline|事件索引与时间线]]
- [[hub/containerization|集装箱化（主题导航）]]
- [[hub/entities|实体台账]]
