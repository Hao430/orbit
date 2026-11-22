#!/usr/bin/env python3
"""一次性补齐 Orbit 契约要求的 summary（40–80 字）与 aliases。"""

import json
import re
from pathlib import Path

ROOT = Path('docs/llm-wiki')

# slug -> (summary, [aliases])
DATA = {
    'hub/containerization': (
        '集装箱化的主题枢纽页，按论证顺序串起交易成本、标准化、规模经济、网络外部性四层机制，并指向人物、组织、船舶与事件的时间线。',
        ['集装箱化主题', '集装箱化导航'],
    ),
    'hub/index': (
        '知识库全量索引，按概念、人物、组织、技术物、地点、来源六类分区，每篇一行说明用途，是检索与检查孤儿页的入口。',
        ['索引', '目录'],
    ),
    'hub/overview': (
        '知识库范围与当前版图：收录了哪个来源、产出了哪些页面、综合到什么程度，以及仍未解决的一手出处缺口。',
        ['总览', '范围说明'],
    ),
    'hub/entities': (
        '实体台账，登记全部人物、组织、船舶、技术物、地点与概念的页面位置、身份与来源覆盖度，并列出待回溯的七项缺口。',
        ['实体索引', '实体表'],
    ),
    'hub/relations': (
        '实体关系图谱，用「主体—谓词→客体」记录有向关系并标注证据强度，另有三条反直觉结论：放弃专利换来标准，工会妥协换来港口崛起。',
        ['关系图', '关系表'],
    ),
    'hub/timeline': (
        '十个事件的时间线，从 1937 年码头排队到 2022 年疫情供应链危机，每条标注触发者、关键数据与后果，并归出技术、政治、风险三条主线。',
        ['时间线', '事件年表'],
    ),

    'people/malcolm-mclean': (
        '集装箱化的发起者。1937 年在码头排队时萌生整箱上船的念头，1955 年卖卡车公司买航运公司，1956 年完成理想 X 号首航，把装卸成本砍掉 97%。',
        ['McLean', '麦克莱恩', '马尔科姆麦克莱恩'],
    ),
    'people/keith-tantlinger': (
        '海陆公司总工程师，发明让集装箱能被吊起并多层堆叠的角件，并在 ISO 会议关键时刻说服麦克莱恩无偿公开专利，扫清全球推广的最后壁垒。',
        ['Tantlinger', '坦特林格'],
    ),
    'people/harry-bridges': (
        '美国西海岸码头工会领袖。他判断机器取代人力不可阻挡，1960 年以补偿基金换取放行集装箱，使洛杉矶与长滩完成转型，与纽约的死扛形成对照。',
        ['Bridges', '布里奇斯'],
    ),
    'people/ronald-coase': (
        '诺贝尔经济学奖得主，交易成本概念的提出者。本知识库用他的框架解释：为什么在集装箱出现之前，大部分商品根本做不起跨国贸易。',
        ['Coase', '科斯'],
    ),
    'people/marc-levinson': (
        '经济学家与历史研究者，测算出集装箱出现前港口的成本结构：一艘货船一年中超一半时间停在港内，六成以上运费花在装卸与停留上。',
        ['Levinson', '莱文森'],
    ),
    'people/david-ricardo': (
        '古典经济学家，比较优势理论的提出者。本知识库用该理论说明一个前提：只有当运输成本足够低时，国际分工才真正成立。',
        ['Ricardo', '李嘉图'],
    ),

    'orgs/sea-land': (
        '麦克莱恩旗下的航运公司，理想 X 号首航的运营方。标准化混战期坚持 35 英尺箱，与美森的 24 英尺方案在会议室里长期对立。',
        ['Sea-Land', '海陆', '海陆公司'],
    ),
    'orgs/matson': (
        '美国西海岸航运巨头，主营夏威夷航线。因为菠萝甘蔗密度导致超重、加州法规允许更短，选择 24 英尺箱，成为标准化谈判中的主要对手。',
        ['Matson', '美森'],
    ),
    'orgs/pan-atlantic': (
        '1955 年被麦克莱恩以 700 万美元收购的航运公司，是他从公路运输跨入航运的资产起点。它与海陆公司是否同一实体，本知识库标记为待核实。',
        ['Pan-Atlantic', '泛大西洋'],
    ),
    'orgs/mclean-trucking': (
        '麦克莱恩从一辆二手卡车起家建立的公路运输公司，1950 年代初做到全美第五、拥有 1700 多辆卡车，1955 年以约 600 万美元出售换取航运资产。',
        ['McLean Trucking', '麦克莱恩卡车'],
    ),
    'orgs/iso': (
        '在 1960 年代中期为集装箱尺寸与角件规格一锤定音的标准机构。谈判长达十年，因为每改一英尺，参与方已投入的箱体与船舶就要全部报废。',
        ['ISO', '国际标准化组织'],
    ),
    'orgs/asa': (
        '1958 年发起集装箱尺寸标准谈判的美国标准机构，后由国际标准化组织接手完成全球标准的制定。本知识库对该机构的记载仅有一个年份。',
        ['ASA', '美国标准协会'],
    ),
    'orgs/dock-unions': (
        '码头工会的两派路线对照：西海岸承认机器不可挡、以补偿基金换取放行；纽约死扛到底，要求按拆箱标准付薪，最终导致船公司撤离、码头荒废。',
        ['ILWU', 'ILA', '码头工会'],
    ),
    'orgs/carriers': (
        '用于说明船舶巨型化的三家企业：马士基在 2000 年代推出万箱级巨轮，中远海运与地中海航运把载箱量推到两万四千标准箱以上。',
        ['马士基', '中远海运', '地中海航运', 'Maersk', 'COSCO', 'MSC'],
    ),

    'artifacts/ideal-x': (
        '第一艘商业集装箱船，由二战旧游轮改装。1956 年载 58 个铝制货箱从纽瓦克驶往休斯顿，装卸成本降到每吨 15.8 美分，比传统散货船低 97%。',
        ['Ideal X', '理想X号'],
    ),
    'artifacts/ever-given': (
        '2021 年在苏伊士运河搁浅的超大型集装箱船，长 400 米、载箱近两万。阻塞六天，每天冻结约 96 亿美元贸易，成为供应链脆弱性的标志性案例。',
        ['Ever Given', '长赐号'],
    ),
    'artifacts/corner-casting': (
        '集装箱八个角上的坚固金属结构，带标准椭圆孔。它能被吊起、能多层堆叠、能在风浪中不散，专利在 1965 年被无偿公开后成为全球接口。',
        ['Corner Casting', '角件'],
    ),
    'artifacts/standard-container': (
        '本篇的主角器物，20 英尺与 40 英尺、宽 8 英尺的铁箱。它从运输单元变成移动仓库，支撑了门到门运输与全球零库存供应链。',
        ['集装箱', '标准箱', 'TEU'],
    ),

    'places/ports': (
        '二十余个港口与航道按叙事功能分组的索引：起点终点、被淘汰的老港、胜出的深水港、战略咽喉与产业集群，并给出港口向深水迁徙的统一机制。',
        ['港口', '码头', '航道'],
    ),
    'places/split-todo': (
        '地点实体拆分待办页，说明为什么当前把二十余个地点合并为索引，并给出三条拆分判据，等后续来源提供足够信息再拆成独立实体页。',
        ['地点待办', '拆分判据'],
    ),

    'concepts/containerization': (
        '集装箱化的机制总览：把跨系统的接口转换成本压到接近零，并由此释放交易成本下降、标准化、规模经济与网络外部性四种力量。',
        ['集装箱化', 'containerization'],
    ),
    'concepts/transaction-cost': (
        '科斯提出的交易成本概念，指生产成本之外花在寻找买家、谈判、运输、保险与防盗上的全部费用。散货时代它高到使多数商品无法跨国贸易。',
        ['交易成本', 'transaction cost'],
    ),
    'concepts/standardization': (
        '标准化的经济本质是消除系统与系统之间的接口转换成本。尺寸标准让箱体通用，接口标准让吊具通用，缺任何一层门到门运输都做不起来。',
        ['标准化', '接口转换成本', 'standardization'],
    ),
    'concepts/economies-of-scale': (
        '规模经济的两条论证：载货量随船体尺寸三次方增长而成本只按二次方增长；两万四千箱的巨轮与两千箱船同样只需二十余名船员。',
        ['规模经济', 'economies of scale'],
    ),
    'concepts/network-externality': (
        '网络外部性让港口吞吐量、航线密度与运费形成自我强化的正循环，并把产业集群锁定在沿海。劳动力成本优势无法抵消物流网络的劣势。',
        ['网络外部性', '网络效应', 'network externality'],
    ),
    'concepts/comparative-advantage': (
        '李嘉图的比较优势理论在本知识库中承担一个前提：分工要划算，运输费就必须足够低，否则省下的劳动力成本会被港口摩擦吃掉。',
        ['比较优势', 'comparative advantage'],
    ),
    'concepts/lean-production': (
        '集装箱把海运变成准时、廉价、高频的公共交通之后，企业取消仓库、把海上集装箱当作移动库存，实现零部件跨国准时到达的精益生产。',
        ['精益生产', 'JIT', 'lean production'],
    ),
    'concepts/zero-inventory': (
        '零库存是精益生产追求的状态，用准时到达替代安全库存。它消除了资金占用、仓储与贬值三重代价，同时把系统缓冲压缩到接近零。',
        ['零库存', 'zero inventory'],
    ),
    'concepts/supply-chain-resilience': (
        '效率推到极致则韧性变脆。长赐号六天阻塞与疫情期间的空箱错配，暴露了集装箱供应链的单点风险，并引出近岸外包与友岸外包的讨论。',
        ['供应链韧性', 'supply chain resilience'],
    ),
    'concepts/break-bulk-shipping': (
        '集装箱之前的主流海运形态，货物以麻袋、木桶、木箱分别装卸。一批货在跨国途中要被拆装六到八次，这是交易成本极高的根源。',
        ['件杂货', 'break-bulk'],
    ),
    'concepts/door-to-door': (
        '麦克莱恩的原始目标：在工厂关上箱门、到买家仓库才打开，中途换多少次交通工具都只动箱子。它依赖尺寸标准与接口标准同时成立。',
        ['门到门', 'door-to-door'],
    ),

    'sources/bilibili-bv12iyvz6evt': (
        'B站科普视频《集装箱革命》的来源摘要，记录标题、BV 号、时长、字幕轨与摄取方式，并逐项标注哪些数字缺少一手出处。',
        ['BV12iyvz6EVT', '集装箱革命'],
    ),
    'sources/transcript-bv12iyvz6evt': (
        '该视频的完整逐字稿，二十节、覆盖两千八百秒内容，由 AI 字幕重组而成，修正了约二十处同音字、专名与数字错录并附清单。',
        ['逐字稿', 'transcript'],
    ),
}

FRONT = re.compile(r'^---\n(.*?)\n---\n', re.S)


def yaml_list(items):
    return '[' + ', '.join(json.dumps(i, ensure_ascii=False) for i in items) + ']'


def main():
    missing = []
    for path in sorted(ROOT.rglob('*.md')):
        slug = path.relative_to(ROOT).with_suffix('').as_posix()
        if slug == 'log':
            continue
        text = path.read_text(encoding='utf-8')
        m = FRONT.match(text)
        if not m:
            missing.append(slug)
            continue
        data = DATA.get(slug)
        if not data:
            missing.append(slug)
            continue
        summary, aliases = data
        body = text[m.end():]

        # 保留已有 title / status，只替换 summary / tags / aliases
        title = None
        status = 'active'
        tags = []
        for line in m.group(1).split('\n'):
            if line.startswith('title:'):
                title = line.split(':', 1)[1].strip()
            elif line.startswith('status:'):
                status = line.split(':', 1)[1].strip()
            elif line.startswith('tags:'):
                tags = json.loads(line.split(':', 1)[1].strip())

        front = '\n'.join([
            '---',
            'title: ' + (title or json.dumps(slug)),
            'summary: ' + json.dumps(summary, ensure_ascii=False),
            'status: ' + status,
            'tags: ' + yaml_list(tags),
            'aliases: ' + yaml_list(aliases),
            '---',
        ]) + '\n'
        path.write_text(front + body, encoding='utf-8')

    if missing:
        print('未覆盖:', missing)
    else:
        print('全部 %d 篇 summary 与 aliases 已补齐' % (len(DATA)))


if __name__ == '__main__':
    main()
