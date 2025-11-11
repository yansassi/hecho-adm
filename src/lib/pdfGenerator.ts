import jsPDF from 'jspdf'
import { ProductWithCategory } from './supabase'

interface Promotion {
  product_id: string
  promotional_price: number
  discount_value: number
  discount_type: 'fixed' | 'percentage'
  active: boolean
}

interface BestSeller {
  product_id: string
  active: boolean
}

interface ProductGroup {
  id: string
  name: string
  isVariationGroup: boolean
  mainProduct: ProductWithCategory
  variations: ProductWithCategory[]
}

interface PDFOptions {
  layout: 'single' | 'grid'
  includePrice: boolean
  title: string
  priceType?: 'price' | 'price_atacado' | 'price_interior' | 'price_mayorista' | 'price_super_mayorista'
  promotions?: Promotion[]
  bestSellers?: BestSeller[]
}

const DEFAULT_IMAGE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAYAAADtt+XCAAAAXVBMVEXz9PT////z9PT09PT19fX29vb39/f4+Pj5+fn6+vr7+/v8/Pz9/f3+/v7///+cnZ6foKGgoaKio6SjpKWkpaanqKmqq6yur7CxsrO0tba3uLm6u7y9vr/BwsO+v8AljMsQAAACv0lEQVR4nO3dS3KDMBBA0ZY8BAEGjIOz/z0OBJIJrpJJd/7nLKALqopCoKqUyOVyuVwul8vlcrlcLpfL5XK5XC6Xy+VyuVwul8vlcrlcLpfL5XK5XC6Xy+VyuVwul8vlcrlcLpfL5XK5XC7X/7r6+nv8/Xr/vz7+fL1fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19f/+97qPX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19f/1f4C7/j3pRVAcUAAAAASUVORK5CYII='

const DEFAULT_IMAGE = DEFAULT_IMAGE_PNG

const fetchImageViaProxy = async (imageUrl: string): Promise<string | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ imageUrl }),
      }
    )

    if (!response.ok) {
      return null
    }

    const { data } = await response.json()
    return data || null
  } catch (error) {
    return null
  }
}

const getProductPromotion = (productId: string, promotions?: Promotion[]): Promotion | undefined => {
  return promotions?.find(p => p.product_id === productId && p.active)
}

const isProductBestSeller = (productId: string, bestSellers?: BestSeller[]): boolean => {
  return bestSellers?.some(bs => bs.product_id === productId && bs.active) || false
}

const isNewProduct = (createdAt: string): boolean => {
  const createdDate = new Date(createdAt)
  const threeWeeksAgo = new Date()
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)
  return createdDate >= threeWeeksAgo
}

const groupProductsByName = (products: ProductWithCategory[]): ProductGroup[] => {
  const groupMap = new Map<string, ProductWithCategory[]>()

  products.forEach(product => {
    const normalizedName = product.nome.trim().toLowerCase()
    if (!groupMap.has(normalizedName)) {
      groupMap.set(normalizedName, [])
    }
    groupMap.get(normalizedName)!.push(product)
  })

  const groups: ProductGroup[] = []

  groupMap.forEach((groupProducts, name) => {
    const sortedProducts = groupProducts.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const mainProduct = sortedProducts[0]
    const isVariationGroup = sortedProducts.length > 1

    groups.push({
      id: mainProduct.id,
      name: mainProduct.nome,
      isVariationGroup,
      mainProduct,
      variations: sortedProducts
    })
  })

  return groups
}

export const generateCatalogPDF = async (
  products: ProductWithCategory[],
  options: PDFOptions
) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    floatPrecision: 16
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const contentWidth = pageWidth - 2 * margin

  let currentY = margin

  const productGroups = groupProductsByName(products)
  const productsByCategory = groupProductsByCategory(products)

  if (options.layout === 'single') {
    let globalProductNum = 1
    const totalProducts = products.length

    for (let catIndex = 0; catIndex < productsByCategory.length; catIndex++) {
      const { categoryName, products: categoryProducts } = productsByCategory[catIndex]

      for (let i = 0; i < categoryProducts.length; i++) {
        if (globalProductNum > 1) {
          pdf.addPage()
          currentY = margin
        }

        currentY = await addProductPageSingle(
          pdf,
          categoryProducts[i],
          pageWidth,
          pageHeight,
          margin,
          contentWidth,
          currentY,
          options,
          globalProductNum,
          totalProducts,
          categoryName
        )

        globalProductNum++
      }
    }
  } else {
    let pageNum = 1

    for (let catIndex = 0; catIndex < productsByCategory.length; catIndex++) {
      const { categoryName, products: categoryProducts } = productsByCategory[catIndex]
      let productIndex = 0

      while (productIndex < categoryProducts.length) {
        if (pageNum > 1) {
          pdf.addPage()
        }

        currentY = await addModernHeader(
          pdf,
          options.title,
          pageWidth,
          pageHeight,
          margin,
          contentWidth,
          margin,
          pageNum,
          categoryName
        )

        const productsAddedCount = await addProductGridWithVariations(
          pdf,
          categoryProducts.slice(productIndex),
          pageWidth,
          pageHeight,
          margin,
          contentWidth,
          currentY,
          options,
          pageNum,
          productGroups
        )

        productIndex += productsAddedCount
        pageNum++
      }
    }
  }

  pdf.setProperties({
    title: options.title,
    subject: 'Catálogo de Produtos',
    author: 'Sistema de Gestão',
    keywords: 'catálogo, produtos',
    creator: 'Sistema de Gestão de Produtos'
  })

  pdf.save(`${options.title.replace(/\s+/g, '_')}.pdf`)
}

const groupProductsByCategory = (products: ProductWithCategory[]): Array<{ categoryName: string, products: ProductWithCategory[] }> => {
  const categoryMap = new Map<string, ProductWithCategory[]>()

  products.forEach(product => {
    const categoryName = product.categories?.name || 'Sem Categoria'

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, [])
    }

    categoryMap.get(categoryName)!.push(product)
  })

  return Array.from(categoryMap.entries()).map(([categoryName, products]) => ({
    categoryName,
    products
  }))
}

const addModernHeader = async (
  pdf: jsPDF,
  title: string,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  currentY: number,
  pageNum: number,
  categoryName?: string
): Promise<number> => {
  const headerHeight = categoryName ? 20 : 16

  pdf.setFillColor(0, 0, 0)
  pdf.rect(0, 0, pageWidth, headerHeight, 'F')

  try {
    const logoUrl = 'https://hechopy.com/logo%20hecho%20colorida%20horizontal.png'
    const logoDataUrl = await fetchImageViaProxy(logoUrl)
    if (logoDataUrl) {
      const logoOriginalWidth = 1080
      const logoOriginalHeight = 367
      const logoAspectRatio = logoOriginalWidth / logoOriginalHeight

      const logoHeight = categoryName ? 10 : 10
      const logoWidth = logoHeight * logoAspectRatio
      const logoX = pageWidth - margin - logoWidth
      const logoY = (headerHeight - logoHeight) / 2

      pdf.addImage(
        logoDataUrl,
        'PNG',
        logoX,
        logoY,
        logoWidth,
        logoHeight,
        undefined,
        'FAST'
      )
    }
  } catch (error) {
    console.warn('Erro ao carregar logo:', error)
  }

  if (categoryName) {
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(title, margin, 8)

    pdf.setFontSize(8)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(250, 234, 43)
    pdf.text(categoryName, margin, 15)
  } else {
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(title, margin, headerHeight / 2 + 2)
  }

  return headerHeight + 3
}

const addFooter = async (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  pageNum: number,
  totalPages: number
): Promise<void> => {
  const footerY = pageHeight - 15
  const footerHeight = 15

  pdf.setFillColor(0, 0, 0)
  pdf.rect(0, footerY, pageWidth, footerHeight, 'F')

  pdf.setFontSize(12)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.text(
    'www.hechopy.com',
    pageWidth / 2,
    footerY + (footerHeight / 2) + 2,
    { align: 'center' }
  )
}

const addProductPageSingle = async (
  pdf: jsPDF,
  product: ProductWithCategory,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  currentY: number,
  options: PDFOptions,
  pageNum: number,
  totalPages: number,
  categoryName?: string
): Promise<number> => {
  const promotion = getProductPromotion(product.id, options.promotions)
  const isBestSeller = isProductBestSeller(product.id, options.bestSellers)
  const isNew = isNewProduct(product.created_at)

  currentY = await addModernHeader(pdf, options.title, pageWidth, pageHeight, margin, contentWidth, margin, pageNum, categoryName)

  const cardY = currentY + 5
  const cardHeight = pageHeight - cardY - 30

  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'FD')

  pdf.setDrawColor(230, 230, 230)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'S')

  const imageSize = 140
  const imageX = pageWidth / 2 - imageSize / 2
  let contentY = cardY + 15

  let imageDataUrl: string | null = null

  if (product.image_url) {
    try {
      imageDataUrl = await fetchImageViaProxy(product.image_url)
    } catch (error) {
      console.warn(`Imagem não carregada para produto ${product.codigo}:`, error)
    }
  }

  if (!imageDataUrl) {
    imageDataUrl = DEFAULT_IMAGE
  }

  if (imageDataUrl) {
    pdf.setFillColor(248, 249, 250)
    pdf.roundedRect(imageX, contentY, imageSize, imageSize, 2, 2, 'F')

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = imageDataUrl
      })

      const imgWidth = img.naturalWidth || img.width
      const imgHeight = img.naturalHeight || img.height
      const containerSize = imageSize

      let finalWidth = containerSize
      let finalHeight = containerSize
      let offsetX = 0
      let offsetY = 0

      if (imgWidth > 0 && imgHeight > 0) {
        const imgRatio = imgWidth / imgHeight
        const containerRatio = 1

        if (imgRatio > containerRatio) {
          finalWidth = containerSize
          finalHeight = containerSize / imgRatio
          offsetY = (containerSize - finalHeight) / 2
        } else {
          finalHeight = containerSize
          finalWidth = containerSize * imgRatio
          offsetX = (containerSize - finalWidth) / 2
        }
      }

      let imageFormat: 'JPEG' | 'PNG' | 'WEBP' = 'JPEG'
      if (imageDataUrl.startsWith('data:image/png')) {
        imageFormat = 'PNG'
      } else if (imageDataUrl.startsWith('data:image/webp')) {
        imageFormat = 'WEBP'
      } else if (imageDataUrl.startsWith('data:image/svg')) {
        imageFormat = 'PNG'
      }

      pdf.addImage(
        imageDataUrl,
        imageFormat,
        imageX + offsetX,
        contentY + offsetY,
        finalWidth,
        finalHeight,
        undefined,
        'FAST'
      )
    } catch (error) {
      console.warn('Erro ao adicionar imagem ao PDF:', error)
    }
  }

  const badgeY = contentY + 5
  const badgeWidth = 35
  const badgeHeight = 12
  const badgeGap = 2

  const tagsToShow: Array<{type: string, color: [number, number, number], text: string}> = []

  if (promotion) {
    tagsToShow.push({type: 'promotion', color: [239, 68, 68], text: 'PROMOCIÓN'})
  }
  if (isBestSeller) {
    tagsToShow.push({type: 'bestseller', color: [34, 197, 94], text: 'MÁS VENDIDO'})
  }
  if (isNew && tagsToShow.length < 2) {
    tagsToShow.push({type: 'new', color: [37, 99, 235], text: 'NUEVO'})
  }

  const maxTags = Math.min(tagsToShow.length, 2)
  const totalWidth = (badgeWidth * maxTags) + (badgeGap * (maxTags - 1))
  let currentBadgeX = imageX + imageSize - totalWidth - 5

  for (let i = 0; i < maxTags; i++) {
    const tag = tagsToShow[i]
    pdf.setFillColor(tag.color[0], tag.color[1], tag.color[2])
    pdf.roundedRect(currentBadgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F')

    pdf.setFontSize(9)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(tag.text, currentBadgeX + badgeWidth / 2, badgeY + 8, { align: 'center' })

    currentBadgeX += badgeWidth + badgeGap
  }

  if (promotion && maxTags > 0) {
    const discountBadgeY = badgeY + badgeHeight + 2
    const discountText = promotion.discount_type === 'percentage'
      ? `-${promotion.discount_value}%`
      : `-₲${promotion.discount_value.toLocaleString('es-PY')}`

    const discountBadgeWidth = 35
    const discountBadgeX = imageX + imageSize - discountBadgeWidth - 5

    pdf.setFillColor(34, 197, 94)
    pdf.roundedRect(discountBadgeX, discountBadgeY, discountBadgeWidth, 10, 2, 2, 'F')

    pdf.setFontSize(8)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(discountText, discountBadgeX + discountBadgeWidth / 2, discountBadgeY + 6.5, { align: 'center' })
  }

  contentY += imageSize + 20

  pdf.setFontSize(16)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(30, 30, 30)
  const nameLines = pdf.splitTextToSize(product.nome, contentWidth - 30)
  pdf.text(nameLines, pageWidth / 2, contentY, { align: 'center', maxWidth: contentWidth - 30 })
  contentY += nameLines.length * 7 + 5

  if (product.description && product.description.trim()) {
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(100, 100, 100)
    const descLines = pdf.splitTextToSize(product.description, contentWidth - 30)
    pdf.text(descLines.slice(0, 3), pageWidth / 2, contentY, { align: 'center', maxWidth: contentWidth - 30 })
    contentY += Math.min(descLines.length, 3) * 5 + 5
  }

  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Código: ${product.codigo}`, pageWidth / 2, contentY, { align: 'center' })
  contentY += 6

  if (product.categories?.name) {
    pdf.setFillColor(243, 244, 246)
    const catText = product.categories.name
    const catWidth = pdf.getTextWidth(catText) + 8
    const catX = pageWidth / 2 - catWidth / 2
    pdf.roundedRect(catX, contentY - 4, catWidth, 6, 1, 1, 'F')

    pdf.setFontSize(8)
    pdf.setTextColor(75, 85, 99)
    pdf.text(catText, pageWidth / 2, contentY, { align: 'center' })
    contentY += 10
  }

  if (options.includePrice) {
    const priceType = options.priceType || 'price'
    const priceValue = Number(product[priceType as keyof ProductWithCategory] || 0)

    if (promotion) {
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(156, 163, 175)
      pdf.setLineDash([0.5, 0.5])
      const oldPriceText = `₲ ${priceValue.toLocaleString('es-PY')}`
      const oldPriceWidth = pdf.getTextWidth(oldPriceText)
      const oldPriceX = pageWidth / 2 - oldPriceWidth / 2
      pdf.text(oldPriceText, pageWidth / 2, contentY, { align: 'center' })
      pdf.line(oldPriceX, contentY - 1, oldPriceX + oldPriceWidth, contentY - 1)
      pdf.setLineDash([])
      contentY += 8

      pdf.setFontSize(20)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(239, 68, 68)
      pdf.text(`₲ ${promotion.promotional_price.toLocaleString('es-PY')}`, pageWidth / 2, contentY, { align: 'center' })
      contentY += 10

      const savings = priceValue - promotion.promotional_price
      const savingsText = `Ahorre ₲ ${savings.toLocaleString('es-PY')}`
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(34, 197, 94)
      pdf.text(savingsText, pageWidth / 2, contentY, { align: 'center' })
    } else {
      pdf.setFontSize(20)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(41, 98, 255)
      pdf.text(`₲ ${priceValue.toLocaleString('es-PY')}`, pageWidth / 2, contentY, { align: 'center' })
    }
  }

  await addFooter(pdf, pageWidth, pageHeight, pageNum, totalPages)

  return currentY
}

const addProductGridWithVariations = async (
  pdf: jsPDF,
  products: ProductWithCategory[],
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  startY: number,
  options: PDFOptions,
  pageNum: number,
  productGroups: ProductGroup[]
): Promise<number> => {
  const cols = 4
  const cardGap = 2.5
  const cardWidth = (contentWidth - (cols - 1) * cardGap) / cols
  const cardHeight = cardWidth + 32

  const footerSpace = 12

  let productIndex = 0
  let currentRow = 0
  let currentCol = 0
  let productsProcessed = 0
  const processedProductIds = new Set<string>()

  const findSingleColumnProduct = (startIndex: number, categoryId: string | null): number => {
    for (let i = startIndex; i < products.length; i++) {
      const product = products[i]

      if (processedProductIds.has(product.id)) {
        continue
      }

      if (categoryId && product.category_id !== categoryId) {
        continue
      }

      const group = productGroups.find(g =>
        g.variations.some(v => v.id === product.id)
      )

      const isVariationGroup = group?.isVariationGroup || false
      if (!isVariationGroup) {
        return i
      }
    }
    return -1
  }

  while (productIndex < products.length) {
    const product = products[productIndex]

    if (processedProductIds.has(product.id)) {
      productIndex++
      continue
    }

    const group = productGroups.find(g =>
      g.variations.some(v => v.id === product.id)
    )

    const isVariationGroup = group?.isVariationGroup || false
    const columnsNeeded = isVariationGroup ? 2 : 1

    if (currentCol + columnsNeeded > cols) {
      if (columnsNeeded === 2 && currentCol === 3) {
        const singleProductIndex = findSingleColumnProduct(productIndex + 1, product.category_id)

        if (singleProductIndex !== -1) {
          const singleProduct = products[singleProductIndex]
          const xPos = margin + currentCol * (cardWidth + cardGap)
          const yPos = startY + currentRow * (cardHeight + cardGap)

          if (yPos + cardHeight <= pageHeight - footerSpace) {
            const promotion = getProductPromotion(singleProduct.id, options.promotions)
            const isBestSeller = isProductBestSeller(singleProduct.id, options.bestSellers)
            const isNew = isNewProduct(singleProduct.created_at)

            await addModernProductCard(
              pdf,
              singleProduct,
              xPos,
              yPos,
              cardWidth,
              cardHeight,
              options,
              promotion,
              isBestSeller,
              isNew
            )

            processedProductIds.add(singleProduct.id)
            productsProcessed++
          }
        }
      }

      currentRow++
      currentCol = 0

      if (currentCol + columnsNeeded > cols) {
        currentRow++
        currentCol = 0
      }
    }

    const xPos = margin + currentCol * (cardWidth + cardGap)
    const yPos = startY + currentRow * (cardHeight + cardGap)

    if (yPos + cardHeight > pageHeight - footerSpace) {
      break
    }

    if (isVariationGroup && group) {
      const doubleCardWidth = cardWidth * 2 + cardGap
      await addVariationGroupCard(
        pdf,
        group,
        xPos,
        yPos,
        doubleCardWidth,
        cardHeight,
        options
      )

      const variationIds = group.variations.map(v => v.id)
      variationIds.forEach(id => processedProductIds.add(id))
      productsProcessed += variationIds.length

      currentCol += 2
      if (currentCol >= cols) {
        currentRow++
        currentCol = 0
      }
    } else {
      const promotion = getProductPromotion(product.id, options.promotions)
      const isBestSeller = isProductBestSeller(product.id, options.bestSellers)
      const isNew = isNewProduct(product.created_at)

      await addModernProductCard(
        pdf,
        product,
        xPos,
        yPos,
        cardWidth,
        cardHeight,
        options,
        promotion,
        isBestSeller,
        isNew
      )

      processedProductIds.add(product.id)
      productsProcessed++
      currentCol++
      if (currentCol >= cols) {
        currentRow++
        currentCol = 0
      }
    }

    productIndex++
  }

  await addFooter(pdf, pageWidth, pageHeight, pageNum, 0)

  return productsProcessed
}

const addVariationGroupCard = async (
  pdf: jsPDF,
  group: ProductGroup,
  xPos: number,
  yPos: number,
  cardWidth: number,
  cardHeight: number,
  options: PDFOptions
): Promise<void> => {
  const padding = 2

  pdf.setFillColor(255, 255, 255)
  pdf.rect(xPos, yPos, cardWidth, cardHeight, 'F')

  pdf.setDrawColor(0, 0, 0)
  pdf.setLineWidth(0.8)
  pdf.rect(xPos, yPos, cardWidth, cardHeight, 'S')

  const imageSize = 45
  const imgX = xPos + padding
  const imgY = yPos + padding

  const displayImage = group.variations.find(v => v.image_url)?.image_url || group.mainProduct.image_url

  if (displayImage) {
    let imageDataUrl: string | null = null
    try {
      imageDataUrl = await fetchImageViaProxy(displayImage)
    } catch (error) {
      console.warn('Erro ao carregar imagem do grupo:', error)
    }

    if (!imageDataUrl) {
      imageDataUrl = DEFAULT_IMAGE
    }

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = imageDataUrl
      })

      const imgWidth = img.naturalWidth || img.width
      const imgHeight = img.naturalHeight || img.height
      let finalWidth = imageSize
      let finalHeight = imageSize
      let offsetX = 0
      let offsetY = 0

      if (imgWidth > 0 && imgHeight > 0) {
        const imgRatio = imgWidth / imgHeight
        if (imgRatio > 1) {
          finalWidth = imageSize
          finalHeight = imageSize / imgRatio
          offsetY = (imageSize - finalHeight) / 2
        } else {
          finalHeight = imageSize
          finalWidth = imageSize * imgRatio
          offsetX = (imageSize - finalWidth) / 2
        }
      }

      let imageFormat: 'JPEG' | 'PNG' | 'WEBP' = 'JPEG'
      if (imageDataUrl.startsWith('data:image/png')) {
        imageFormat = 'PNG'
      } else if (imageDataUrl.startsWith('data:image/webp')) {
        imageFormat = 'WEBP'
      } else if (imageDataUrl.startsWith('data:image/svg')) {
        imageFormat = 'PNG'
      }

      pdf.addImage(
        imageDataUrl,
        imageFormat,
        imgX + offsetX,
        imgY + offsetY,
        finalWidth,
        finalHeight,
        undefined,
        'FAST'
      )
    } catch (error) {
      console.warn('Erro ao adicionar imagem ao PDF:', error)
    }
  }

  const hasPromotion = group.variations.some(v => {
    const promo = options.promotions?.find(p => p.product_id === v.id && p.active)
    return !!promo
  })

  const hasBestSeller = group.variations.some(v => {
    return options.bestSellers?.some(bs => bs.product_id === v.id && bs.active)
  })

  const hasNew = group.variations.some(v => isNewProduct(v.created_at))

  const rightColumnX = imgX + imageSize + 3
  const rightColumnWidth = cardWidth - imageSize - (padding * 2) - 3

  const tagY = yPos + padding
  const tagWidth = 23
  const tagHeight = 6
  const tagGap = 1

  const tagsToShow: Array<{type: string, color: [number, number, number], text: string}> = []

  if (hasPromotion) {
    tagsToShow.push({type: 'promotion', color: [239, 68, 68], text: 'PROMOCIÓN'})
  }
  if (hasBestSeller) {
    tagsToShow.push({type: 'bestseller', color: [34, 197, 94], text: 'MÁS VENDIDO'})
  }
  if (hasNew && tagsToShow.length < 2) {
    tagsToShow.push({type: 'new', color: [37, 99, 235], text: 'NUEVO'})
  }

  const maxTags = Math.min(tagsToShow.length, 2)
  const totalTagWidth = (tagWidth * maxTags) + (tagGap * (maxTags - 1))
  let currentTagX = xPos + cardWidth - totalTagWidth - padding

  for (let i = 0; i < maxTags; i++) {
    const tag = tagsToShow[i]
    pdf.setFillColor(tag.color[0], tag.color[1], tag.color[2])
    pdf.roundedRect(currentTagX, tagY, tagWidth, tagHeight, 1.5, 1.5, 'F')

    pdf.setFontSize(tag.type === 'promotion' ? 6.5 : 7)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(tag.text, currentTagX + tagWidth / 2, tagY + 4, { align: 'center' })

    currentTagX += tagWidth + tagGap
  }

  let textY = imgY + (imageSize / 2)

  pdf.setFontSize(7)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(29, 29, 27)
  const nameLines = pdf.splitTextToSize(group.name.toUpperCase(), rightColumnWidth)
  pdf.text(nameLines[0] || group.name, rightColumnX, textY, { align: 'left' })
  textY += 4

  if (group.mainProduct.description && group.mainProduct.description.trim()) {
    pdf.setFontSize(5)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(100, 100, 100)
    const descLines = pdf.splitTextToSize(group.mainProduct.description, rightColumnWidth)
    const displayDesc = descLines.slice(0, 1)
    pdf.text(displayDesc[0] || '', rightColumnX, textY, { align: 'left' })
    textY += 4
  }

  const barHeight = 4.5
  const barY = yPos + cardHeight - barHeight
  const tableX = xPos + padding
  const tableWidth = cardWidth - (padding * 2)
  const rowHeight = 3.5
  const headerHeight = 4
  const colWidths = [tableWidth * 0.25, tableWidth * 0.50, tableWidth * 0.25]

  const totalVariations = group.variations.length
  const tableHeight = headerHeight + (totalVariations * rowHeight)
  const tableY = barY - tableHeight

  pdf.setDrawColor(220, 220, 220)
  pdf.setLineWidth(0.2)

  pdf.setFillColor(240, 240, 240)
  pdf.rect(tableX, tableY, tableWidth, headerHeight, 'F')

  pdf.setFontSize(4)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(29, 29, 27)
  pdf.text('Código', tableX + 1, tableY + 2.8, { align: 'left' })
  pdf.text('Descrição', tableX + colWidths[0] + 1, tableY + 2.8, { align: 'left' })
  pdf.text('Valor', tableX + colWidths[0] + colWidths[1] + colWidths[2] / 2, tableY + 2.8, { align: 'center' })

  pdf.setDrawColor(220, 220, 220)
  pdf.line(tableX, tableY + headerHeight, tableX + tableWidth, tableY + headerHeight)

  let currentTableY = tableY + headerHeight

  for (let i = 0; i < totalVariations; i++) {
    const variation = group.variations[i]
    const priceType = options.priceType || 'price'
    const priceValue = Number(variation[priceType as keyof ProductWithCategory] || 0)

    const rowY = currentTableY + (i * rowHeight)

    if (options.includePrice) {
      pdf.setFillColor(250, 234, 43)
      pdf.rect(tableX + colWidths[0] + colWidths[1], rowY, colWidths[2], rowHeight, 'F')
    }

    pdf.setDrawColor(220, 220, 220)
    pdf.line(tableX, rowY + rowHeight, tableX + tableWidth, rowY + rowHeight)

    pdf.setFontSize(4)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(50, 50, 50)

    const codigoText = variation.codigo
    const codigoLines = pdf.splitTextToSize(codigoText, colWidths[0] - 2)
    pdf.text(codigoLines[0] || codigoText, tableX + 1, rowY + 2.5, { align: 'left' })

    let descText = variation.description || ''
    if (variation.info) {
      descText = descText ? `${descText} - ${variation.info}` : variation.info
    }
    if (!descText) descText = '-'

    const descLines = pdf.splitTextToSize(descText, colWidths[1] - 2)
    pdf.text(descLines[0] || descText, tableX + colWidths[0] + 1, rowY + 2.5, { align: 'left' })

    if (options.includePrice) {
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(29, 29, 27)
      pdf.text(`Gs. ${priceValue.toLocaleString('es-PY')}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] / 2, rowY + 2.5, { align: 'center' })
    }
  }

  pdf.setFillColor(29, 29, 27)
  pdf.rect(xPos, barY, cardWidth, barHeight, 'F')
}

const addModernProductCard = async (
  pdf: jsPDF,
  product: ProductWithCategory,
  xPos: number,
  yPos: number,
  cardWidth: number,
  cardHeight: number,
  options: PDFOptions,
  promotion?: Promotion,
  isBestSeller?: boolean,
  isNew?: boolean
): Promise<void> => {
  const centerX = xPos + cardWidth / 2
  const padding = 2
  const imageSize = cardWidth - (padding * 2)

  pdf.setFillColor(255, 255, 255)
  pdf.rect(xPos, yPos, cardWidth, cardHeight, 'F')

  pdf.setDrawColor(0, 0, 0)
  pdf.setLineWidth(0.8)
  pdf.rect(xPos, yPos, cardWidth, cardHeight, 'S')

  const imgX = xPos + padding
  const imgY = yPos + padding

  let imageDataUrl: string | null = null

  if (product.image_url) {
    try {
      imageDataUrl = await fetchImageViaProxy(product.image_url)
    } catch (error) {
      console.warn(`Imagem não carregada para produto ${product.codigo}:`, error)
    }
  }

  if (!imageDataUrl) {
    imageDataUrl = DEFAULT_IMAGE
  }

  if (imageDataUrl) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = imageDataUrl
      })

      const imgWidth = img.naturalWidth || img.width
      const imgHeight = img.naturalHeight || img.height
      const containerSize = imageSize

      let finalWidth = containerSize
      let finalHeight = containerSize
      let offsetX = 0
      let offsetY = 0

      if (imgWidth > 0 && imgHeight > 0) {
        const imgRatio = imgWidth / imgHeight
        const containerRatio = 1

        if (imgRatio > containerRatio) {
          finalWidth = containerSize
          finalHeight = containerSize / imgRatio
          offsetY = (containerSize - finalHeight) / 2
        } else {
          finalHeight = containerSize
          finalWidth = containerSize * imgRatio
          offsetX = (containerSize - finalWidth) / 2
        }
      }

      let imageFormat: 'JPEG' | 'PNG' | 'WEBP' = 'JPEG'
      if (imageDataUrl.startsWith('data:image/png')) {
        imageFormat = 'PNG'
      } else if (imageDataUrl.startsWith('data:image/webp')) {
        imageFormat = 'WEBP'
      } else if (imageDataUrl.startsWith('data:image/svg')) {
        imageFormat = 'PNG'
      }

      pdf.addImage(
        imageDataUrl,
        imageFormat,
        imgX + offsetX,
        imgY + offsetY,
        finalWidth,
        finalHeight,
        undefined,
        'FAST'
      )
    } catch (error) {
      console.warn('Erro ao adicionar imagem ao PDF:', error)
    }
  }

  const tagY = yPos + padding
  const tagGap = 0.8
  
  const tagsToShow: Array<{type: string, color: [number, number, number], text: string}> = []

  if (promotion) {
    tagsToShow.push({type: 'promotion', color: [239, 68, 68], text: 'PROMO'})
  }
  if (isBestSeller) {
    tagsToShow.push({type: 'bestseller', color: [34, 197, 94], text: 'TOP'})
  }
  if (isNew && tagsToShow.length < 2) {
    tagsToShow.push({type: 'new', color: [37, 99, 235], text: 'NUEVO'})
  }

  const maxTags = Math.min(tagsToShow.length, 2)
  const availableWidth = cardWidth - (padding * 2)
  
  // Calcular largura dinâmica baseada no número de tags
  const tagWidth = maxTags === 2 
    ? (availableWidth - tagGap) / 2  // Divide espaço igualmente se houver 2 tags
    : Math.min(22, availableWidth)    // Tag única pode ser maior, mas com limite
  
  const tagHeight = 5.5
  const totalTagWidth = (tagWidth * maxTags) + (tagGap * (maxTags - 1))
  let currentTagX = xPos + cardWidth - totalTagWidth - padding

  for (let i = 0; i < maxTags; i++) {
    const tag = tagsToShow[i]
    pdf.setFillColor(tag.color[0], tag.color[1], tag.color[2])
    pdf.roundedRect(currentTagX, tagY, tagWidth, tagHeight, 1.2, 1.2, 'F')

    // Ajustar tamanho da fonte baseado na largura da tag
    const fontSize = maxTags === 2 ? 5.5 : 6.5
    pdf.setFontSize(fontSize)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(tag.text, currentTagX + tagWidth / 2, tagY + 3.8, { align: 'center' })

    currentTagX += tagWidth + tagGap
  }

  let textY = imgY + imageSize + 4

  pdf.setFontSize(7)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(29, 29, 27)

  const nameLines = pdf.splitTextToSize(product.nome.toUpperCase(), cardWidth - 4)
  const displayName = nameLines.slice(0, 1)
  displayName.forEach((line: string) => {
    pdf.text(line, centerX, textY, { align: 'center' })
    textY += 3.2
  })

  if (product.description && product.description.trim()) {
    pdf.setFontSize(5)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(100, 100, 100)

    const descLines = pdf.splitTextToSize(product.description, cardWidth - 4)
    const displayDesc = descLines.slice(0, 2)
    displayDesc.forEach((line: string) => {
      pdf.text(line, centerX, textY, { align: 'center' })
      textY += 2.8
    })
    textY += 0.5
  }

  if (product.quantidade) {
    pdf.setFontSize(5.5)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(135, 135, 135)

    const quantLines = pdf.splitTextToSize(product.quantidade, cardWidth - 4)
    if (quantLines[0]) {
      pdf.text(quantLines[0], centerX, textY, { align: 'center' })
      textY += 3
    }
  }

  const barHeight = 4.5
  const barY = yPos + cardHeight - barHeight

  if (options.includePrice) {
    const priceType = options.priceType || 'price'
    const priceValue = Number(product[priceType as keyof ProductWithCategory] || 0)

    const priceBoxHeight = 7
    const priceBoxPadding = 2
    const priceBoxY = barY - priceBoxHeight - 1

    pdf.setFillColor(250, 234, 43)
    pdf.roundedRect(xPos + priceBoxPadding, priceBoxY, cardWidth - (priceBoxPadding * 2), priceBoxHeight, 3, 3, 'F')

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(29, 29, 27)
    pdf.text(`Gs. ${priceValue.toLocaleString('es-PY')}`, centerX, priceBoxY + 5, { align: 'center' })
  }

  pdf.setFillColor(29, 29, 27)
  pdf.rect(xPos, barY, cardWidth, barHeight, 'F')

  pdf.setFontSize(5)
  pdf.setFont(undefined, 'normal')
  pdf.setTextColor(218, 218, 218)
  pdf.text(`Cód.: ${product.codigo}`, centerX, barY + 3, { align: 'center' })
}
