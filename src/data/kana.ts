import type { ExampleWord, KanaCategory, KanaItem, RowDef, Script } from '../types/kana'

/**
 * Nguồn dữ liệu Kana. Mọi KanaItem được sinh từ các bảng gọn bên dưới để dễ bảo trì:
 *  - SEION: 46 chữ cơ bản, có mẹo nhớ + ví dụ riêng cho từng bảng chữ.
 *  - DAKUON / HANDAKUON / YOON: sinh tự động từ chữ gốc + dấu ゛ ゜ hoặc ゃゅょ nhỏ.
 * `key` là định danh duy nhất (ぢ = 'di', づ = 'du') để id không trùng dù romaji giống nhau.
 */

type Ex = [kana: string, romaji: string, meaningVi: string, kanji?: string]
const ex = (e?: Ex): ExampleWord | undefined =>
  e ? { kana: e[0], romaji: e[1], meaningVi: e[2], kanji: e[3] } : undefined

interface SeionRow {
  key: string
  romaji: string
  row: string
  hira: string
  kata: string
  hiraHint: string
  kataHint: string
  hiraEx?: Ex
  kataEx?: Ex
}

// prettier-ignore
const SEION: SeionRow[] = [
  { key: 'a', romaji: 'a', row: 'a', hira: 'あ', kata: 'ア', hiraHint: 'あ có chữ thập và vòng xoáy – như một quả táo (Apple) đang lăn.', kataHint: 'ア giống chiếc rìu (Axe) chém xuống.', hiraEx: ['あめ', 'ame', 'mưa', '雨'], kataEx: ['アイス', 'aisu', 'kem'] },
  { key: 'i', romaji: 'i', row: 'a', hira: 'い', kata: 'イ', hiraHint: 'い là hai con lươn (eel) đứng cạnh nhau: "i-i".', kataHint: 'イ như người nghiêng mình dựa vào cột.', hiraEx: ['いぬ', 'inu', 'con chó', '犬'], kataEx: ['イギリス', 'igirisu', 'nước Anh'] },
  { key: 'u', romaji: 'u', row: 'a', hira: 'う', kata: 'ウ', hiraHint: 'う như người ôm bụng kêu "u…" vì đau bụng.', kataHint: 'ウ là う được che thêm mái nhà.', hiraEx: ['うみ', 'umi', 'biển', '海'], kataEx: ['ウイルス', 'uirusu', 'virus'] },
  { key: 'e', romaji: 'e', row: 'a', hira: 'え', kata: 'エ', hiraHint: 'え như người đang nhảy tung chân – "Ê!".', kataHint: 'エ giống thanh dầm của thang máy (Elevator).', hiraEx: ['えき', 'eki', 'nhà ga', '駅'], kataEx: ['エアコン', 'eakon', 'máy lạnh'] },
  { key: 'o', romaji: 'o', row: 'a', hira: 'お', kata: 'オ', hiraHint: 'お như người chơi golf vung gậy và hét "Ô!".', kataHint: 'オ như người dang tay chạy về đích.', hiraEx: ['おちゃ', 'ocha', 'trà', 'お茶'], kataEx: ['オレンジ', 'orenji', 'quả cam'] },

  { key: 'ka', romaji: 'ka', row: 'ka', hira: 'か', kata: 'カ', hiraHint: 'か như người đang múa, tay giơ cao, miệng hô "ka!".', kataHint: 'カ là か bỏ nét nhỏ – giống con dao cắt (Cut).', hiraEx: ['かさ', 'kasa', 'cái ô', '傘'], kataEx: ['カメラ', 'kamera', 'máy ảnh'] },
  { key: 'ki', romaji: 'ki', row: 'ka', hira: 'き', kata: 'キ', hiraHint: 'き giống chiếc chìa khóa (Key) có răng.', kataHint: 'キ là chiếc chìa khóa đơn giản hơn.', hiraEx: ['きって', 'kitte', 'con tem', '切手'], kataEx: ['キス', 'kisu', 'nụ hôn'] },
  { key: 'ku', romaji: 'ku', row: 'ka', hira: 'く', kata: 'ク', hiraHint: 'く là mỏ con chim cúc cu đang mở: "ku ku".', kataHint: 'ク là く có thêm mái che.', hiraEx: ['くち', 'kuchi', 'miệng', '口'], kataEx: ['クラス', 'kurasu', 'lớp học'] },
  { key: 'ke', romaji: 'ke', row: 'ka', hira: 'け', kata: 'ケ', hiraHint: 'け như thùng bia (Keg) đứng cạnh cây cột.', kataHint: 'ケ giống chữ K bị nghiêng.', hiraEx: ['けむり', 'kemuri', 'khói', '煙'], kataEx: ['ケーキ', 'keeki', 'bánh kem'] },
  { key: 'ko', romaji: 'ko', row: 'ka', hira: 'こ', kata: 'コ', hiraHint: 'こ là hai con sâu trong kén (Cocoon) nằm song song.', kataHint: 'コ là một góc tường vuông vức.', hiraEx: ['こころ', 'kokoro', 'trái tim', '心'], kataEx: ['コーヒー', 'koohii', 'cà phê'] },

  { key: 'sa', romaji: 'sa', row: 'sa', hira: 'さ', kata: 'サ', hiraHint: 'さ như cá voi phun nước – "sa…" tiếng nước rơi.', kataHint: 'サ là さ viết vuông vức hơn.', hiraEx: ['さくら', 'sakura', 'hoa anh đào', '桜'], kataEx: ['サラダ', 'sarada', 'salad'] },
  { key: 'shi', romaji: 'shi', row: 'sa', hira: 'し', kata: 'シ', hiraHint: 'し là chiếc lưỡi câu – "shi" như tiếng giật cần.', kataHint: 'シ là mặt cười nhìn lên, nét cuối kéo từ DƯỚI lên (khác ツ).', hiraEx: ['しお', 'shio', 'muối', '塩'], kataEx: ['シャツ', 'shatsu', 'áo sơ mi'] },
  { key: 'su', romaji: 'su', row: 'sa', hira: 'す', kata: 'ス', hiraHint: 'す như sợi mì xoắn vòng trên đũa – "suu" húp mì.', kataHint: 'ス như người đang chạy sải bước dài.', hiraEx: ['すし', 'sushi', 'sushi', '寿司'], kataEx: ['スープ', 'suupu', 'món súp'] },
  { key: 'se', romaji: 'se', row: 'sa', hira: 'せ', kata: 'セ', hiraHint: 'せ như cái miệng mở rộng đang nói (Say).', kataHint: 'セ là せ bớt đi một nét dọc.', hiraEx: ['せかい', 'sekai', 'thế giới', '世界'], kataEx: ['セーター', 'seetaa', 'áo len'] },
  { key: 'so', romaji: 'so', row: 'sa', hira: 'そ', kata: 'ソ', hiraHint: 'そ như đường chỉ khâu zig-zag (Sew).', kataHint: 'ソ có nét phẩy kéo từ TRÊN xuống (khác ン).', hiraEx: ['そら', 'sora', 'bầu trời', '空'], kataEx: ['ソース', 'soosu', 'nước sốt'] },

  { key: 'ta', romaji: 'ta', row: 'ta', hira: 'た', kata: 'タ', hiraHint: 'た ghép từ chữ "t" và "a" – đọc là "ta".', kataHint: 'タ như ク có thêm một gạch – chữ "ta".', hiraEx: ['たまご', 'tamago', 'quả trứng', '卵'], kataEx: ['タクシー', 'takushii', 'taxi'] },
  { key: 'chi', romaji: 'chi', row: 'ta', hira: 'ち', kata: 'チ', hiraHint: 'ち giống số 5 bị uốn cong – "chi" chín cằm.', kataHint: 'チ như cô gái cổ vũ (Cheer) giơ tay.', hiraEx: ['ちず', 'chizu', 'bản đồ', '地図'], kataEx: ['チーズ', 'chiizu', 'phô mai'] },
  { key: 'tsu', romaji: 'tsu', row: 'ta', hira: 'つ', kata: 'ツ', hiraHint: 'つ là con sóng thần (Tsunami) cuộn tới.', kataHint: 'ツ là mặt cười, nét cuối kéo từ TRÊN xuống (khác シ).', hiraEx: ['つき', 'tsuki', 'mặt trăng', '月'], kataEx: ['ツアー', 'tsuaa', 'chuyến du lịch'] },
  { key: 'te', romaji: 'te', row: 'ta', hira: 'て', kata: 'テ', hiraHint: 'て là cái móc treo hình chữ T.', kataHint: 'テ giống cột ăng-ten TV.', hiraEx: ['てがみ', 'tegami', 'lá thư', '手紙'], kataEx: ['テレビ', 'terebi', 'ti vi'] },
  { key: 'to', romaji: 'to', row: 'ta', hira: 'と', kata: 'ト', hiraHint: 'と như ngón chân (Toe) bị đóng cái đinh.', kataHint: 'ト như cây cột totem có một nhánh.', hiraEx: ['とり', 'tori', 'con chim', '鳥'], kataEx: ['トマト', 'tomato', 'cà chua'] },

  { key: 'na', romaji: 'na', row: 'na', hira: 'な', kata: 'ナ', hiraHint: 'な như nữ tu (Nun) đang quỳ cầu nguyện.', kataHint: 'ナ như con dao cắt ngang quả chuối (baNAna).', hiraEx: ['なつ', 'natsu', 'mùa hè', '夏'], kataEx: ['ナイフ', 'naifu', 'con dao'] },
  { key: 'ni', romaji: 'ni', row: 'na', hira: 'に', kata: 'ニ', hiraHint: 'に như đầu gối (Knee) đặt cạnh cây cột.', kataHint: 'ニ là hai gạch – số 2 tiếng Nhật đọc "ni".', hiraEx: ['にく', 'niku', 'thịt', '肉'], kataEx: ['テニス', 'tenisu', 'quần vợt'] },
  { key: 'nu', romaji: 'nu', row: 'na', hira: 'ぬ', kata: 'ヌ', hiraHint: 'ぬ như sợi mì (Noodle) cuộn tròn có đuôi xoắn.', kataHint: 'ヌ như đôi đũa gắp sợi mì.', hiraEx: ['いぬ', 'inu', 'con chó', '犬'], kataEx: ['カヌー', 'kanuu', 'ca nô'] },
  { key: 'ne', romaji: 'ne', row: 'na', hira: 'ね', kata: 'ネ', hiraHint: 'ね như con mèo (Neko) cuộn đuôi tròn.', kataHint: 'ネ như người đeo cà vạt (Necktie).', hiraEx: ['ねこ', 'neko', 'con mèo', '猫'], kataEx: ['ネクタイ', 'nekutai', 'cà vạt'] },
  { key: 'no', romaji: 'no', row: 'na', hira: 'の', kata: 'ノ', hiraHint: 'の giống biển báo cấm – "No!".', kataHint: 'ノ chỉ một nét phẩy – lắc đầu nói "No".', hiraEx: ['のり', 'nori', 'rong biển', '海苔'], kataEx: ['ノート', 'nooto', 'quyển vở'] },

  { key: 'ha', romaji: 'ha', row: 'ha', hira: 'は', kata: 'ハ', hiraHint: 'は như người đứng cạnh cột cười "ha ha".', kataHint: 'ハ là hai nét tỏa ra như tiếng cười "ha ha".', hiraEx: ['はな', 'hana', 'hoa', '花'], kataEx: ['ハム', 'hamu', 'giăm bông'] },
  { key: 'hi', romaji: 'hi', row: 'ha', hira: 'ひ', kata: 'ヒ', hiraHint: 'ひ như cái miệng đang cười "hi hi".', kataHint: 'ヒ như người ngồi quay lưng cười "hi".', hiraEx: ['ひと', 'hito', 'người', '人'], kataEx: ['ヒーター', 'hiitaa', 'máy sưởi'] },
  { key: 'fu', romaji: 'fu', row: 'ha', hira: 'ふ', kata: 'フ', hiraHint: 'ふ như núi Phú Sĩ (Fuji) với mây bay quanh.', kataHint: 'フ như cái móc treo áo.', hiraEx: ['ふね', 'fune', 'con thuyền', '船'], kataEx: ['フランス', 'furansu', 'nước Pháp'] },
  { key: 'he', romaji: 'he', row: 'ha', hira: 'へ', kata: 'ヘ', hiraHint: 'へ như ngọn đồi nhỏ – leo lên kêu "hê!".', kataHint: 'ヘ gần như giống hệt へ.', hiraEx: ['へや', 'heya', 'căn phòng', '部屋'], kataEx: ['ヘルメット', 'herumetto', 'mũ bảo hiểm'] },
  { key: 'ho', romaji: 'ho', row: 'ha', hira: 'ほ', kata: 'ホ', hiraHint: 'ほ như ngôi nhà (Home) có ống khói bên cạnh.', kataHint: 'ホ như cây thập tự trên nóc khách sạn (Hotel).', hiraEx: ['ほし', 'hoshi', 'ngôi sao', '星'], kataEx: ['ホテル', 'hoteru', 'khách sạn'] },

  { key: 'ma', romaji: 'ma', row: 'ma', hira: 'ま', kata: 'マ', hiraHint: 'ま như mẹ (Mama) đội hai chiếc mũ.', kataHint: 'マ như cái mặt nạ (Mask) hình tam giác.', hiraEx: ['まど', 'mado', 'cửa sổ', '窓'], kataEx: ['マスク', 'masuku', 'khẩu trang'] },
  { key: 'mi', romaji: 'mi', row: 'ma', hira: 'み', kata: 'ミ', hiraHint: 'み như số 21 viết liền – "mi".', kataHint: 'ミ có 3 vạch – số 3 (mittsu) bắt đầu bằng "mi".', hiraEx: ['みみ', 'mimi', 'cái tai', '耳'], kataEx: ['ミルク', 'miruku', 'sữa'] },
  { key: 'mu', romaji: 'mu', row: 'ma', hira: 'む', kata: 'ム', hiraHint: 'む như con bò kêu "moo" với cái đuôi vểnh.', kataHint: 'ム như cánh tay gập lại khoe cơ bắp (Muscle).', hiraEx: ['むし', 'mushi', 'côn trùng', '虫'], kataEx: ['ゲーム', 'geemu', 'trò chơi'] },
  { key: 'me', romaji: 'me', row: 'ma', hira: 'め', kata: 'メ', hiraHint: 'め như con mắt (me = mắt) có con ngươi.', kataHint: 'メ là dấu X đánh dấu tin nhắn (Message).', hiraEx: ['めがね', 'megane', 'kính mắt', '眼鏡'], kataEx: ['メロン', 'meron', 'dưa lưới'] },
  { key: 'mo', romaji: 'mo', row: 'ma', hira: 'も', kata: 'モ', hiraHint: 'も như lưỡi câu móc thêm mồi – câu thêm (More) cá.', kataHint: 'モ là も bỏ phần móc cong.', hiraEx: ['もも', 'momo', 'quả đào', '桃'], kataEx: ['メモ', 'memo', 'ghi chú'] },

  { key: 'ya', romaji: 'ya', row: 'ya', hira: 'や', kata: 'ヤ', hiraHint: 'や như con bò Tây Tạng (Yak) có sừng.', kataHint: 'ヤ là や viết thẳng nét.', hiraEx: ['やま', 'yama', 'núi', '山'], kataEx: ['タイヤ', 'taiya', 'lốp xe'] },
  { key: 'yu', romaji: 'yu', row: 'ya', hira: 'ゆ', kata: 'ユ', hiraHint: 'ゆ như con cá bơi trong bể nước nóng (yu = nước nóng).', kataHint: 'ユ như cái móc hình chữ U (yU).', hiraEx: ['ゆき', 'yuki', 'tuyết', '雪'], kataEx: ['ユーモア', 'yuumoa', 'sự hài hước'] },
  { key: 'yo', romaji: 'yo', row: 'ya', hira: 'よ', kata: 'ヨ', hiraHint: 'よ như người đang chơi yo-yo.', kataHint: 'ヨ như chữ E bị lật ngược.', hiraEx: ['よる', 'yoru', 'buổi tối', '夜'], kataEx: ['ヨガ', 'yoga', 'yoga'] },

  { key: 'ra', romaji: 'ra', row: 'ra', hira: 'ら', kata: 'ラ', hiraHint: 'ら như chú thỏ (Rabbit) đang ngồi.', kataHint: 'ラ như chiếc radio có ăng-ten ngang.', hiraEx: ['らくだ', 'rakuda', 'lạc đà'], kataEx: ['ラジオ', 'rajio', 'radio'] },
  { key: 'ri', romaji: 'ri', row: 'ra', hira: 'り', kata: 'リ', hiraHint: 'り như hai dòng sông (River) chảy song song.', kataHint: 'リ gần giống り nhưng nét thẳng hơn.', hiraEx: ['りんご', 'ringo', 'quả táo', '林檎'], kataEx: ['リボン', 'ribon', 'ruy băng'] },
  { key: 'ru', romaji: 'ru', row: 'ra', hira: 'る', kata: 'ル', hiraHint: 'る như con đường (Route) có vòng xuyến ở cuối.', kataHint: 'ル như hai cái chân đứng dạng ra.', hiraEx: ['くるま', 'kuruma', 'xe ô tô', '車'], kataEx: ['ルール', 'ruuru', 'luật lệ'] },
  { key: 're', romaji: 're', row: 'ra', hira: 'れ', kata: 'レ', hiraHint: 'れ như người quỳ gối với cái chân duỗi dài.', kataHint: 'レ như dấu tích – tia Laser chiếu góc.', hiraEx: ['れきし', 'rekishi', 'lịch sử', '歴史'], kataEx: ['レモン', 'remon', 'quả chanh'] },
  { key: 'ro', romaji: 'ro', row: 'ra', hira: 'ろ', kata: 'ロ', hiraHint: 'ろ như số 3 – con đường (Road) uốn lượn.', kataHint: 'ロ là hình vuông – đầu con Robot.', hiraEx: ['ろうそく', 'rousoku', 'cây nến'], kataEx: ['ロボット', 'robotto', 'robot'] },

  { key: 'wa', romaji: 'wa', row: 'wa', hira: 'わ', kata: 'ワ', hiraHint: 'わ như ね nhưng không có đuôi – "wa!" con mèo mất đuôi.', kataHint: 'ワ như chiếc ly rượu vang (Wine).', hiraEx: ['わたし', 'watashi', 'tôi', '私'], kataEx: ['ワイン', 'wain', 'rượu vang'] },
  { key: 'wo', romaji: 'wo', row: 'wa', hira: 'を', kata: 'ヲ', hiraHint: 'を như người đang bơi ngửa – "wo…". Chủ yếu dùng làm trợ từ, đọc là "o".', kataHint: 'ヲ rất hiếm dùng – giống フ có thêm gạch ngang.', hiraEx: ['を', 'o', 'trợ từ chỉ tân ngữ'] },
  { key: 'n', romaji: 'n', row: 'n', hira: 'ん', kata: 'ン', hiraHint: 'ん giống chữ "n" viết tay.', kataHint: 'ン có nét phẩy kéo từ DƯỚI lên (khác ソ).', hiraEx: ['ほん', 'hon', 'quyển sách', '本'], kataEx: ['パン', 'pan', 'bánh mì'] },
]

// [key, romaji, row, baseKey, hira, kata]
// prettier-ignore
const DAKUON: [string, string, string, string, string, string][] = [
  ['ga', 'ga', 'ga', 'ka', 'が', 'ガ'], ['gi', 'gi', 'ga', 'ki', 'ぎ', 'ギ'], ['gu', 'gu', 'ga', 'ku', 'ぐ', 'グ'], ['ge', 'ge', 'ga', 'ke', 'げ', 'ゲ'], ['go', 'go', 'ga', 'ko', 'ご', 'ゴ'],
  ['za', 'za', 'za', 'sa', 'ざ', 'ザ'], ['ji', 'ji', 'za', 'shi', 'じ', 'ジ'], ['zu', 'zu', 'za', 'su', 'ず', 'ズ'], ['ze', 'ze', 'za', 'se', 'ぜ', 'ゼ'], ['zo', 'zo', 'za', 'so', 'ぞ', 'ゾ'],
  ['da', 'da', 'da', 'ta', 'だ', 'ダ'], ['di', 'ji', 'da', 'chi', 'ぢ', 'ヂ'], ['du', 'zu', 'da', 'tsu', 'づ', 'ヅ'], ['de', 'de', 'da', 'te', 'で', 'デ'], ['do', 'do', 'da', 'to', 'ど', 'ド'],
  ['ba', 'ba', 'ba', 'ha', 'ば', 'バ'], ['bi', 'bi', 'ba', 'hi', 'び', 'ビ'], ['bu', 'bu', 'ba', 'fu', 'ぶ', 'ブ'], ['be', 'be', 'ba', 'he', 'べ', 'ベ'], ['bo', 'bo', 'ba', 'ho', 'ぼ', 'ボ'],
]

// prettier-ignore
const HANDAKUON: [string, string, string, string, string, string][] = [
  ['pa', 'pa', 'pa', 'ha', 'ぱ', 'パ'], ['pi', 'pi', 'pa', 'hi', 'ぴ', 'ピ'], ['pu', 'pu', 'pa', 'fu', 'ぷ', 'プ'], ['pe', 'pe', 'pa', 'he', 'ぺ', 'ペ'], ['po', 'po', 'pa', 'ho', 'ぽ', 'ポ'],
]

// [row, prefix, baseKey, hiraBase, kataBase] → sinh 3 chữ: -ya, -yu, -yo
// prettier-ignore
const YOON_BASES: [string, string, string, string, string][] = [
  ['kya', 'ky', 'ki', 'き', 'キ'], ['sha', 'sh', 'shi', 'し', 'シ'], ['cha', 'ch', 'chi', 'ち', 'チ'],
  ['nya', 'ny', 'ni', 'に', 'ニ'], ['hya', 'hy', 'hi', 'ひ', 'ヒ'], ['mya', 'my', 'mi', 'み', 'ミ'],
  ['rya', 'ry', 'ri', 'り', 'リ'], ['gya', 'gy', 'gi', 'ぎ', 'ギ'], ['ja', 'j', 'ji', 'じ', 'ジ'],
  ['bya', 'by', 'bi', 'び', 'ビ'], ['pya', 'py', 'pi', 'ぴ', 'ピ'],
]

/** Ví dụ cho các chữ không phải thanh âm, tra theo mặt chữ. */
// prettier-ignore
const EXTRA_EXAMPLES: Record<string, Ex> = {
  が: ['がっこう', 'gakkou', 'trường học', '学校'], ぎ: ['ぎんこう', 'ginkou', 'ngân hàng', '銀行'], ご: ['ごはん', 'gohan', 'cơm', 'ご飯'], げ: ['げんき', 'genki', 'khỏe mạnh', '元気'], ぐ: ['ぐんて', 'gunte', 'găng tay lao động', '軍手'],
  ざ: ['ざっし', 'zasshi', 'tạp chí', '雑誌'], じ: ['じかん', 'jikan', 'thời gian', '時間'], ず: ['みず', 'mizu', 'nước', '水'], ぜ: ['かぜ', 'kaze', 'gió', '風'], ぞ: ['ぞう', 'zou', 'con voi', '象'],
  だ: ['だいがく', 'daigaku', 'đại học', '大学'], ぢ: ['はなぢ', 'hanaji', 'chảy máu cam', '鼻血'], づ: ['つづく', 'tsuzuku', 'tiếp tục', '続く'], で: ['でんわ', 'denwa', 'điện thoại', '電話'], ど: ['まど', 'mado', 'cửa sổ', '窓'],
  ば: ['ばら', 'bara', 'hoa hồng'], び: ['びょういん', 'byouin', 'bệnh viện', '病院'], ぶ: ['ぶた', 'buta', 'con lợn', '豚'], べ: ['べんとう', 'bentou', 'cơm hộp', '弁当'], ぼ: ['ぼうし', 'boushi', 'cái mũ', '帽子'],
  ぱ: ['かんぱい', 'kanpai', 'cạn ly', '乾杯'], ぴ: ['えんぴつ', 'enpitsu', 'bút chì', '鉛筆'], ぷ: ['てんぷら', 'tenpura', 'món tempura', '天ぷら'], ぺ: ['ぺこぺこ', 'pekopeko', 'đói meo'], ぽ: ['さんぽ', 'sanpo', 'đi dạo', '散歩'],
  ガ: ['ガム', 'gamu', 'kẹo cao su'], ギ: ['ギター', 'gitaa', 'đàn ghi-ta'], グ: ['グラス', 'gurasu', 'cái ly'], ゲ: ['ゲーム', 'geemu', 'trò chơi'], ゴ: ['ゴルフ', 'gorufu', 'môn golf'],
  ザ: ['デザイン', 'dezain', 'thiết kế'], ジ: ['ジュース', 'juusu', 'nước ép'], ズ: ['チーズ', 'chiizu', 'phô mai'], ゼ: ['ゼロ', 'zero', 'số không'], ゾ: ['ゾーン', 'zoon', 'khu vực'],
  ダ: ['ダンス', 'dansu', 'nhảy múa'], デ: ['デパート', 'depaato', 'trung tâm thương mại'], ド: ['ドア', 'doa', 'cánh cửa'],
  バ: ['バス', 'basu', 'xe buýt'], ビ: ['ビル', 'biru', 'tòa nhà'], ブ: ['ブラシ', 'burashi', 'bàn chải'], ベ: ['ベッド', 'beddo', 'giường'], ボ: ['ボール', 'booru', 'quả bóng'],
  パ: ['パン', 'pan', 'bánh mì'], ピ: ['ピアノ', 'piano', 'đàn piano'], プ: ['プール', 'puuru', 'bể bơi'], ペ: ['ペン', 'pen', 'cây bút'], ポ: ['ポスト', 'posuto', 'hòm thư'],
  きゃ: ['きゃく', 'kyaku', 'khách', '客'], きゅ: ['きゅうり', 'kyuuri', 'dưa chuột'], きょ: ['きょう', 'kyou', 'hôm nay', '今日'],
  しゃ: ['しゃしん', 'shashin', 'bức ảnh', '写真'], しゅ: ['しゅくだい', 'shukudai', 'bài tập về nhà', '宿題'], しょ: ['しょくじ', 'shokuji', 'bữa ăn', '食事'],
  ちゃ: ['おちゃ', 'ocha', 'trà', 'お茶'], ちゅ: ['ちゅうごく', 'chuugoku', 'Trung Quốc', '中国'], ちょ: ['ちょっと', 'chotto', 'một chút'],
  にゃ: ['にゃあ', 'nyaa', 'tiếng mèo kêu'], にゅ: ['ぎゅうにゅう', 'gyuunyuu', 'sữa bò', '牛乳'], ひゃ: ['ひゃく', 'hyaku', 'một trăm', '百'],
  みゃ: ['みゃく', 'myaku', 'mạch đập', '脈'], りゅ: ['りゅう', 'ryuu', 'con rồng', '竜'], りょ: ['りょこう', 'ryokou', 'du lịch', '旅行'],
  ぎゅ: ['ぎゅうにく', 'gyuuniku', 'thịt bò', '牛肉'], じゃ: ['じゃま', 'jama', 'phiền phức', '邪魔'], じゅ: ['じゅぎょう', 'jugyou', 'giờ học', '授業'], じょ: ['じょうず', 'jouzu', 'giỏi', '上手'],
  びょ: ['びょうき', 'byouki', 'bệnh', '病気'], ぴょ: ['ぴょんぴょん', 'pyonpyon', 'nhảy tưng tưng'],
  キャ: ['キャベツ', 'kyabetsu', 'bắp cải'], シャ: ['シャツ', 'shatsu', 'áo sơ mi'], シュ: ['シューズ', 'shuuzu', 'giày'], ショ: ['ショー', 'shoo', 'buổi biểu diễn'],
  チャ: ['チャンス', 'chansu', 'cơ hội'], チョ: ['チョコ', 'choko', 'sô-cô-la'], ニュ: ['ニュース', 'nyuusu', 'tin tức'], ジャ: ['ジャム', 'jamu', 'mứt'], ジュ: ['ジュース', 'juusu', 'nước ép'],
}

const PREFIX: Record<Script, string> = { hiragana: 'hira', katakana: 'kata' }
const SMALL: Record<Script, [string, string, string]> = {
  hiragana: ['ゃ', 'ゅ', 'ょ'],
  katakana: ['ャ', 'ュ', 'ョ'],
}

function buildScript(script: Script): KanaItem[] {
  const isHira = script === 'hiragana'
  const p = PREFIX[script]
  const seionByKey = new Map(SEION.map((s) => [s.key, s]))
  const charOf = (key: string) => {
    const s = seionByKey.get(key)!
    return isHira ? s.hira : s.kata
  }
  const items: KanaItem[] = []

  for (const s of SEION) {
    items.push({
      id: `${p}_${s.key}`,
      char: isHira ? s.hira : s.kata,
      romaji: s.romaji,
      type: script,
      category: 'seion',
      row: s.row,
      mnemonicHint: isHira ? s.hiraHint : s.kataHint,
      exampleWord: ex(isHira ? s.hiraEx : s.kataEx),
    })
  }

  const derived = (list: typeof DAKUON, category: KanaCategory, mark: string) => {
    for (const [key, romaji, row, baseKey, h, k] of list) {
      const char = isHira ? h : k
      const base = charOf(baseKey)
      const rare = key === 'di' || key === 'du' ? ' (Hiếm dùng – phát âm giống じ/ず.)' : ''
      items.push({
        id: `${p}_${key}`,
        char,
        romaji,
        type: script,
        category,
        row,
        mnemonicHint: `${base} (${seionByKey.get(baseKey)!.romaji}) + ${mark} → ${char} "${romaji}".${rare}`,
        exampleWord: ex(EXTRA_EXAMPLES[char]),
      })
    }
  }
  derived(DAKUON, 'dakuon', 'dấu tenten ゛(âm đục)')
  derived(HANDAKUON, 'handakuon', 'vòng tròn maru ゜(âm bật hơi "p")')

  for (const [row, prefix, baseKey, hBase, kBase] of YOON_BASES) {
    const base = isHira ? hBase : kBase
    const vowels = ['a', 'u', 'o']
    SMALL[script].forEach((small, i) => {
      const romaji = `${prefix}${vowels[i]}`
      const char = base + small
      items.push({
        id: `${p}_${romaji}`,
        char,
        romaji,
        type: script,
        category: 'yoon',
        row,
        mnemonicHint: `${base} (${seionByKey.get(baseKey)?.romaji ?? baseKey}) + ${small} nhỏ → đọc liền một nhịp "${romaji}".`,
        exampleWord: ex(EXTRA_EXAMPLES[char]),
      })
    })
  }
  return items
}

export const HIRAGANA: KanaItem[] = buildScript('hiragana')
export const KATAKANA: KanaItem[] = buildScript('katakana')
export const ALL_KANA: KanaItem[] = [...HIRAGANA, ...KATAKANA]

export const KANA_BY_ID = new Map(ALL_KANA.map((k) => [k.id, k]))
export const KANA_BY_CHAR = new Map(ALL_KANA.map((k) => [k.char, k]))

export const CATEGORY_LABELS: Record<KanaCategory, { vi: string; jp: string; desc: string }> = {
  seion: { vi: 'Thanh âm', jp: '清音', desc: 'Âm cơ bản (46 chữ)' },
  dakuon: { vi: 'Biến âm', jp: '濁音', desc: 'Âm đục – thêm dấu ゛' },
  handakuon: { vi: 'Bán biến âm', jp: '半濁音', desc: 'Âm bán đục – thêm ゜' },
  yoon: { vi: 'Ảo âm', jp: '拗音', desc: 'Âm ghép với ゃゅょ nhỏ' },
}

// prettier-ignore
export const ROWS: RowDef[] = [
  ...['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n'].map((id) => ({ id, label: id === 'n' ? 'N' : `Hàng ${id.toUpperCase()}`, category: 'seion' as const })),
  ...['ga', 'za', 'da', 'ba'].map((id) => ({ id, label: `Hàng ${id.toUpperCase()}`, category: 'dakuon' as const })),
  { id: 'pa', label: 'Hàng PA', category: 'handakuon' },
  ...['kya', 'sha', 'cha', 'nya', 'hya', 'mya', 'rya', 'gya', 'ja', 'bya', 'pya'].map((id) => ({ id, label: id.toUpperCase(), category: 'yoon' as const })),
]
export const ALL_ROW_IDS = ROWS.map((r) => r.id)

/** Bố cục Gojūon: mỗi hàng có 5 ô theo nguyên âm a-i-u-e-o (null = ô trống). */
// prettier-ignore
export const GOJUON_GRID: Record<'seion' | 'dakuon' | 'yoon', (string | null)[][]> = {
  seion: [
    ['a', 'i', 'u', 'e', 'o'], ['ka', 'ki', 'ku', 'ke', 'ko'], ['sa', 'shi', 'su', 'se', 'so'],
    ['ta', 'chi', 'tsu', 'te', 'to'], ['na', 'ni', 'nu', 'ne', 'no'], ['ha', 'hi', 'fu', 'he', 'ho'],
    ['ma', 'mi', 'mu', 'me', 'mo'], ['ya', null, 'yu', null, 'yo'], ['ra', 'ri', 'ru', 're', 'ro'],
    ['wa', null, null, null, 'wo'], ['n', null, null, null, null],
  ],
  dakuon: [
    ['ga', 'gi', 'gu', 'ge', 'go'], ['za', 'ji', 'zu', 'ze', 'zo'], ['da', 'di', 'du', 'de', 'do'],
    ['ba', 'bi', 'bu', 'be', 'bo'], ['pa', 'pi', 'pu', 'pe', 'po'],
  ],
  yoon: YOON_BASES.map(([, prefix]) => [`${prefix}a`, `${prefix}u`, `${prefix}o`]),
}
