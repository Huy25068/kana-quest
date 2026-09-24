import type { Script, WordEntry } from '../types/kana'

/** Ký tự bổ trợ không nằm trong bảng Kana (っ nhỏ, trường âm ー) – luôn được phép trong Word Builder. */
export const HELPER_TOKENS = new Set(['っ', 'ッ', 'ー'])

type W = [tokens: string, romaji: string, meaningVi: string, kanji?: string]

// Token phân tách bằng dấu "|" để giữ ảo âm (ちゃ, しゃ...) thành một khối.
// prettier-ignore
const HIRA_WORDS: W[] = [
  ['さ|く|ら', 'sakura', 'Hoa anh đào', '桜'], ['ね|こ', 'neko', 'Con mèo', '猫'], ['い|ぬ', 'inu', 'Con chó', '犬'],
  ['す|し', 'sushi', 'Sushi', '寿司'], ['や|ま', 'yama', 'Núi', '山'], ['う|み', 'umi', 'Biển', '海'],
  ['そ|ら', 'sora', 'Bầu trời', '空'], ['は|な', 'hana', 'Hoa', '花'], ['あ|め', 'ame', 'Mưa', '雨'],
  ['つ|き', 'tsuki', 'Mặt trăng', '月'], ['ゆ|き', 'yuki', 'Tuyết', '雪'], ['ほ|し', 'hoshi', 'Ngôi sao', '星'],
  ['く|る|ま', 'kuruma', 'Xe ô tô', '車'], ['た|ま|ご', 'tamago', 'Quả trứng', '卵'], ['と|も|だ|ち', 'tomodachi', 'Bạn bè', '友達'],
  ['あ|り|が|と|う', 'arigatou', 'Cảm ơn'], ['さ|か|な', 'sakana', 'Con cá', '魚'], ['み|ず', 'mizu', 'Nước', '水'],
  ['ひ|と', 'hito', 'Người', '人'], ['て|が|み', 'tegami', 'Lá thư', '手紙'], ['か|ば|ん', 'kaban', 'Cái cặp', '鞄'],
  ['で|ん|わ', 'denwa', 'Điện thoại', '電話'], ['が|っ|こ|う', 'gakkou', 'Trường học', '学校'], ['せ|ん|せ|い', 'sensei', 'Giáo viên', '先生'],
  ['り|ん|ご', 'ringo', 'Quả táo', '林檎'], ['お|ちゃ', 'ocha', 'Trà', 'お茶'], ['で|ん|しゃ', 'densha', 'Tàu điện', '電車'],
  ['きょ|う', 'kyou', 'Hôm nay', '今日'], ['ひ|こ|う|き', 'hikouki', 'Máy bay', '飛行機'], ['に|ほ|ん', 'nihon', 'Nhật Bản', '日本'],
  ['か|さ', 'kasa', 'Cái ô', '傘'], ['き|の|こ', 'kinoko', 'Cây nấm'], ['な|つ', 'natsu', 'Mùa hè', '夏'],
  ['ふ|ゆ', 'fuyu', 'Mùa đông', '冬'], ['あ|き', 'aki', 'Mùa thu', '秋'], ['は|る', 'haru', 'Mùa xuân', '春'],
  ['え|き', 'eki', 'Nhà ga', '駅'], ['ほ|ん', 'hon', 'Quyển sách', '本'], ['め|が|ね', 'megane', 'Kính mắt', '眼鏡'],
  ['しゃ|し|ん', 'shashin', 'Bức ảnh', '写真'], ['りょ|こ|う', 'ryokou', 'Du lịch', '旅行'], ['ぎゅ|う|にゅ|う', 'gyuunyuu', 'Sữa bò', '牛乳'],
]

// prettier-ignore
const KATA_WORDS: W[] = [
  ['カ|メ|ラ', 'kamera', 'Máy ảnh'], ['テ|レ|ビ', 'terebi', 'Ti vi'], ['パ|ン', 'pan', 'Bánh mì'],
  ['コ|ー|ヒ|ー', 'koohii', 'Cà phê'], ['ト|マ|ト', 'tomato', 'Cà chua'], ['メ|ロ|ン', 'meron', 'Dưa lưới'],
  ['ケ|ー|キ', 'keeki', 'Bánh kem'], ['ア|イ|ス', 'aisu', 'Kem'], ['ピ|ア|ノ', 'piano', 'Đàn piano'],
  ['ホ|テ|ル', 'hoteru', 'Khách sạn'], ['タ|ク|シ|ー', 'takushii', 'Taxi'], ['バ|ナ|ナ', 'banana', 'Quả chuối'],
  ['ノ|ー|ト', 'nooto', 'Quyển vở'], ['ゲ|ー|ム', 'geemu', 'Trò chơi'], ['ミ|ル|ク', 'miruku', 'Sữa'],
  ['レ|モ|ン', 'remon', 'Quả chanh'], ['ラ|ジ|オ', 'rajio', 'Radio'], ['ス|ポ|ー|ツ', 'supootsu', 'Thể thao'],
  ['チ|ー|ズ', 'chiizu', 'Phô mai'], ['シャ|ツ', 'shatsu', 'Áo sơ mi'], ['バ|ス', 'basu', 'Xe buýt'],
  ['ペ|ン', 'pen', 'Cây bút'], ['ギ|タ|ー', 'gitaa', 'Đàn ghi-ta'], ['ニュ|ー|ス', 'nyuusu', 'Tin tức'],
  ['サ|ラ|ダ', 'sarada', 'Salad'], ['ロ|ボ|ッ|ト', 'robotto', 'Robot'], ['ワ|イ|ン', 'wain', 'Rượu vang'],
  ['ジュ|ー|ス', 'juusu', 'Nước ép'], ['キャ|ベ|ツ', 'kyabetsu', 'Bắp cải'], ['ハ|ム', 'hamu', 'Giăm bông'],
]

const build = (list: W[], script: Script): WordEntry[] =>
  list.map(([tokens, romaji, meaningVi, kanji]) => ({
    id: `${script}_${romaji}`,
    script,
    tokens: tokens.split('|'),
    romaji,
    meaningVi,
    kanji,
  }))

export const WORDS: WordEntry[] = [...build(HIRA_WORDS, 'hiragana'), ...build(KATA_WORDS, 'katakana')]
