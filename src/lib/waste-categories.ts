/**
 * Waste category definitions — single source of truth.
 *
 * product-brief.md §Initial Waste Taxonomy:
 * "All category values must be defined in one place and never duplicated."
 *
 * Any change to WasteCategory values must be reflected here only.
 * Do not hardcode category strings elsewhere in the codebase.
 */

import type { WasteCategory } from '@/types/classification'

// ── Educational content metadata ───────────────────────────────────────────

export interface CategoryEdu {
  /** 2–3 sentences on environmental impact */
  environmentalImpact: string
  /** Key fact with bold highlighted statistic */
  keyFact: {
    prefix: string
    highlight: string
    suffix: string
  }
  /** Expanded disposal instructions */
  disposalDetail: string
}

// ── Category metadata ──────────────────────────────────────────────────────

export interface CategoryMeta {
  id: WasteCategory
  /** Display label in Vietnamese */
  label: string
  /** Short example list for UI tooltips / learn page */
  examples: string
  /** CSS custom property name for the accent colour */
  accentVar: string
  /** CSS custom property name for the tint background */
  tintVar: string
  /** Educational drawer content */
  edu: CategoryEdu
}

/**
 * Ordered list of all valid waste categories.
 * The `unknown` category is always last and is reserved for low-confidence
 * results (confidence < 0.6).
 */
export const WASTE_CATEGORIES: readonly CategoryMeta[] = [
  {
    id: 'recyclable',
    label: 'Rác tái chế',
    examples: 'Giấy, nhựa PET, lon nhôm, thuỷ tinh',
    accentVar: '--color-cat-recyclable',
    tintVar: '--color-cat-recyclable-tint',
    edu: {
      environmentalImpact:
        'Tái chế giúp giảm khai thác tài nguyên thiên nhiên và tiết kiệm năng lượng đáng kể. Chẳng hạn, tái chế nhôm tiết kiệm đến 95% năng lượng so với sản xuất từ quặng bauxite nguyên sinh.',
      keyFact: {
        prefix: 'Tái chế 1 lon nhôm tiết kiệm đủ năng lượng để xem TV trong ',
        highlight: '3 giờ',
        suffix: '.',
      },
      disposalDetail:
        'Rửa sạch cặn bẩn, để khô và làm bẹp vỏ chai, lon trước khi vứt. Bỏ vào thùng rác tái chế màu vàng hoặc gom lại gửi các điểm thu gom tái chế tại trường học.',
    },
  },
  {
    id: 'organic',
    label: 'Rác hữu cơ',
    examples: 'Thức ăn thừa, vỏ trái cây, lá cây',
    accentVar: '--color-cat-organic',
    tintVar: '--color-cat-organic-tint',
    edu: {
      environmentalImpact:
        'Rác hữu cơ chiếm hơn 50% tổng lượng rác sinh hoạt tại các đô thị Việt Nam. Khi bị chôn lấp chung, chúng phân hủy yếm khí tạo ra khí methane (CH₄) — loại khí gây hiệu ứng nhà kính mạnh gấp 25 lần CO₂.',
      keyFact: {
        prefix: '1 tấn rác hữu cơ được ủ đúng cách có thể tạo ra ',
        highlight: '300 kg',
        suffix: ' phân bón hữu cơ giàu dinh dưỡng.',
      },
      disposalDetail:
        'Tách riêng thức ăn thừa, cuống rau, vỏ trái cây khỏi bao bì nilon. Bỏ vào thùng rác hữu cơ màu xanh lá hoặc ủ làm phân compost bón cây.',
    },
  },
  {
    id: 'hazardous',
    label: 'Rác nguy hại',
    examples: 'Pin, bóng đèn huỳnh quang, hoá chất',
    accentVar: '--color-cat-hazardous',
    tintVar: '--color-cat-hazardous-tint',
    edu: {
      environmentalImpact:
        'Pin và hoá chất chứa các kim loại nặng cực độc như chì, cadmium và thủy ngân. Khi bị chôn lấp bừa bãi, các chất độc này ngấm vào mạch nước ngầm và đất, gây tích tụ độc tố trong chuỗi thức ăn.',
      keyFact: {
        prefix: '1 viên pin AA có thể làm ô nhiễm ',
        highlight: '500.000 lít',
        suffix: ' nước ngầm.',
      },
      disposalDetail:
        'Tuyệt đối không đập vỡ hay đốt. Giữ nguyên vẹn và mang đến các hộp thu gom pin tại trường học, siêu thị, hoặc điểm thu gom rác thải nguy hại của địa phương.',
    },
  },
  {
    id: 'electronic',
    label: 'Rác điện tử',
    examples: 'Điện thoại cũ, dây cáp, phụ kiện',
    accentVar: '--color-cat-electronic',
    tintVar: '--color-cat-electronic-tint',
    edu: {
      environmentalImpact:
        'Rác điện tử chứa cả kim loại quý giá và các chất chống cháy độc hại. Việc đốt hoặc tháo dỡ thủ công ngoài trời phát tán khí dioxin và khói độc vào bầu không khí xung quanh.',
      keyFact: {
        prefix: '1 triệu điện thoại cũ tái chế có thể thu hồi tới ',
        highlight: '35.000 kg',
        suffix: ' đồng và 350 kg bạc.',
      },
      disposalDetail:
        'Gom các thiết bị cũ, sạc, dây cáp hỏng và chuyển đến các điểm thu hồi thiết bị điện tử uy tín hoặc gửi lại các nhà sản xuất có chương trình thu hồi.',
    },
  },
  {
    id: 'general',
    label: 'Rác thải thông thường',
    examples: 'Bao bì nhiều lớp, tã, cao su',
    accentVar: '--color-cat-general',
    tintVar: '--color-cat-general-tint',
    edu: {
      environmentalImpact:
        'Rác thông thường gồm các vật liệu không thể tái chế kinh tế (bao bì nhiều lớp, tã, cao su). Phần lớn loại rác này được đưa đến bãi chôn lấp hợp vệ sinh hoặc nhà máy đốt phát điện.',
      keyFact: {
        prefix: 'Bao bì nhựa dùng một lần mất đến ',
        highlight: '500 năm',
        suffix: ' để phân rã hoàn toàn thành các hạt vi nhựa.',
      },
      disposalDetail:
        'Đựng kín trong túi rác sinh hoạt trước khi bỏ vào thùng rác chung. Hạn chế sử dụng đồ nhựa dùng một lần để giảm thiểu phát sinh rác thải này.',
    },
  },
  {
    id: 'unknown',
    label: 'Không xác định',
    examples: 'Độ chính xác thấp hoặc hình ảnh không rõ',
    accentVar: '--color-cat-unknown',
    tintVar: '--color-cat-unknown-tint',
    edu: {
      environmentalImpact:
        'Phân loại sai khiến cả mẻ rác tái chế bị nhiễm bẩn và phải đem đi chôn lấp. Khi còn phân vân, quan sát kỹ các ký hiệu trên bao bì hoặc phân tách các bộ phận trước khi xử lý.',
      keyFact: {
        prefix: 'Chỉ cần 1 chai dầu nhớt lẫn vào có thể làm hỏng ',
        highlight: '1 tấn',
        suffix: ' rác tái chế xung quanh.',
      },
      disposalDetail:
        'Thử chụp lại ảnh với ánh sáng tốt và góc nhìn rõ hơn. Nếu vật dụng gồm nhiều chất liệu (như hộp giấy tráng nhôm), hãy tháo rời từng phần để phân loại chính xác.',
    },
  },
] as const

/** Look up category metadata by ID. Throws if not found (should not happen). */
export function getCategoryMeta(id: WasteCategory): CategoryMeta {
  const meta = WASTE_CATEGORIES.find(c => c.id === id)
  if (!meta) throw new Error(`Unknown waste category: ${id}`)
  return meta
}

/** Returns inline style object for a category zone (left border + tint bg). */
export function getCategoryZoneStyle(id: WasteCategory): React.CSSProperties {
  const { accentVar, tintVar } = getCategoryMeta(id)
  return {
    borderLeft: `4px solid var(${accentVar})`,
    backgroundColor: `var(${tintVar})`,
  }
}
