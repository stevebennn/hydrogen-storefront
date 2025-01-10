import {defer, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer({...deferredData, ...criticalData});
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  params,
  request,
}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront, env} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
  ]);

  let completeTheLookProduct = null;

  if (product?.metafield) {
    completeTheLookProduct = (
      await storefront.query(COMPLETE_THE_LOOK_PRODUCT_QUERY, {
        variables: {
          id: product.metafield.value,
          selectedOptions: getSelectedProductOptions(request),
        },
      })
    ).product;
  }

  // Simple fetch to DatoCMS GraphQL API
  const dato = await fetch('https://graphql.datocms.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DATO_API_TOKEN}`,
    },
    body: JSON.stringify({
      query: `
          query DatoQuery ($handle: String!) {
            detail(filter: {slug: {eq:$handle}}) {
              title
              content {
              __typename
              ... on RichTextRecord {
                  textContent
                }
                ... on BulletRecord {
                  content
                }
              }
            }
          }
        `,
      variables: {handle: `/${handle}`},
    }),
  }).then((res) => res.json());

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return {
    product,
    completeTheLookProduct,
    datoContent: dato?.data?.detail?.content || null, // Get first matching item or null
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: LoaderFunctionArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const {product, completeTheLookProduct, datoContent} =
    useLoaderData<typeof loader>();

  console.log(datoContent);

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Only create completeTheLookSelectedVariant if completeTheLookProduct exists
  const completeTheLookSelectedVariant = useOptimisticVariant(
    completeTheLookProduct?.selectedOrFirstAvailableVariant ?? null,
    completeTheLookProduct
      ? getAdjacentAndFirstAvailableVariants(completeTheLookProduct)
      : null,
  );

  // Only get completeTheLookProductOptions if completeTheLookProduct exists
  const completeTheLookProductOptions = completeTheLookProduct
    ? getProductOptions({
        ...completeTheLookProduct,
        selectedOrFirstAvailableVariant: completeTheLookSelectedVariant,
      })
    : null;

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml, metafield} = product;

  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />

        <div className="description border-b border-gray-200 pb-10">
          <p className="text-lg font-bold">Description</p>
          <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        </div>

        {completeTheLookProduct && (
          <div className="w-full grid max-w-[200px] mt-10">
            <p className="text-lg font-bold">complete the look</p>
            <ProductImage image={completeTheLookSelectedVariant?.image} />
            <h3>{completeTheLookProduct?.title}</h3>
            <ProductPrice
              price={completeTheLookSelectedVariant?.price}
              compareAtPrice={completeTheLookSelectedVariant?.compareAtPrice}
            />
            <ProductForm
              productOptions={completeTheLookProductOptions!}
              selectedVariant={completeTheLookSelectedVariant}
            />
          </div>
        )}
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    metafield(namespace:"custom",key:"complete_the_look") {
      value
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const COMPLETE_THE_LOOK_PRODUCT_QUERY = `#graphql
  query CompleteTheLookProduct(
    $country: CountryCode
    $id: ID
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(id: $id) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
