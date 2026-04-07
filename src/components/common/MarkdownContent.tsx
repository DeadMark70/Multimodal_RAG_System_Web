import {
  Box,
  Code,
  Link,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { FiSearch } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';

import { normalizeMarkdown } from '../../utils/markdown';

export type MarkdownVariant = 'chat' | 'report' | 'compact';

export interface MarkdownContentProps {
  content: string;
  variant?: MarkdownVariant;
  preserveSourceTokens?: boolean;
  resolveImageSrc?: (src: string | undefined) => string;
  onImageClick?: (src: string, alt: string) => void;
  className?: string;
}

interface DecoratableElementProps {
  children?: ReactNode;
  'data-testid'?: string;
}

type ReactMarkdownProps = ComponentProps<typeof ReactMarkdown>;
type RemarkPlugin = NonNullable<ReactMarkdownProps['remarkPlugins']>[number];
type RehypePlugin = NonNullable<ReactMarkdownProps['rehypePlugins']>[number];
type ComponentProp<K extends keyof Components> = Components[K] extends (props: infer P) => unknown ? P : never;

type MarkdownImageProps = ComponentProp<'img'>;
type MarkdownAnchorProps = ComponentProp<'a'>;
type MarkdownCodeProps = ComponentProp<'code'>;
type MarkdownParagraphProps = ComponentProp<'p'>;
type MarkdownHeadingProps = ComponentProp<'h1'>;
type MarkdownListProps = ComponentProp<'ul'>;
type MarkdownListItemProps = ComponentProp<'li'>;
type MarkdownBlockquoteProps = ComponentProp<'blockquote'>;
type MarkdownTableProps = ComponentProp<'table'>;
type MarkdownTableCellProps = ComponentProp<'td'>;

const remarkGfmPlugin = remarkGfm as unknown as RemarkPlugin;
const rehypeSanitizePlugin = rehypeSanitize as unknown as RehypePlugin;

const SOURCE_TOKEN_PATTERN = /(\[來源:[^\]]+\])/g;

interface VariantStyles {
  containerFontSize: string | { base: string; lg?: string };
  paragraphMarginBottom: number;
  blockSpacing: number;
  listSpacing: number;
  codeFontSize: string;
}

function getVariantStyles(variant: MarkdownVariant): VariantStyles {
  switch (variant) {
    case 'compact':
      return {
        containerFontSize: 'sm',
        paragraphMarginBottom: 2,
        blockSpacing: 3,
        listSpacing: 2,
        codeFontSize: 'xs',
      };
    case 'report':
      return {
        containerFontSize: { base: 'md', lg: 'lg' },
        paragraphMarginBottom: 3,
        blockSpacing: 4,
        listSpacing: 3,
        codeFontSize: 'sm',
      };
    case 'chat':
    default:
      return {
        containerFontSize: 'md',
        paragraphMarginBottom: 2,
        blockSpacing: 3,
        listSpacing: 2,
        codeFontSize: 'sm',
      };
  }
}

function MarkdownContentComponent({
  content,
  variant = 'chat',
  preserveSourceTokens = false,
  resolveImageSrc,
  onImageClick,
  className,
}: MarkdownContentProps) {
  const normalizedContent = useMemo(() => normalizeMarkdown(content), [content]);
  const variantStyles = useMemo(() => getVariantStyles(variant), [variant]);

  const linkColor = useColorModeValue('brand.500', 'brand.300');
  const codeBg = useColorModeValue('gray.100', 'gray.700');
  const blockquoteBorderColor = useColorModeValue('gray.300', 'whiteAlpha.300');
  const blockquoteBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const imageFrameBg = useColorModeValue('white', 'whiteAlpha.100');
  const imageBorderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.200');
  const sourceTokenBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const sourceTokenColor = useColorModeValue('gray.600', 'gray.300');
  const sourceTokenBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const tableBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  const remarkPlugins = useMemo<NonNullable<ReactMarkdownProps['remarkPlugins']>>(
    () => [remarkGfmPlugin],
    [],
  );
  const rehypePlugins = useMemo<NonNullable<ReactMarkdownProps['rehypePlugins']>>(
    () => [rehypeSanitizePlugin],
    [],
  );

  const components = useMemo<Components>(() => {
    const componentMap: Components = {};

    const decorateNode = (child: ReactNode): ReactNode[] => {
        if (typeof child === 'string') {
          if (preserveSourceTokens) {
            return [child];
          }

          const parts = child.split(SOURCE_TOKEN_PATTERN);
          if (parts.length === 1) {
            return [child];
          }

          return parts
            .filter((part) => part.length > 0)
            .map((part, index) =>
              part.startsWith('[來源:') && part.endsWith(']') ? (
                <Box
                  as="span"
                  key={`${part}-${index}`}
                  data-testid="markdown-source-token"
                  display="inline-flex"
                  alignItems="center"
                  px={2}
                  py={0.5}
                  mx={1}
                  borderRadius="full"
                  border="1px solid"
                  borderColor={sourceTokenBorderColor}
                  bg={sourceTokenBg}
                  color={sourceTokenColor}
                  fontSize="0.82em"
                  lineHeight="1.2"
                  verticalAlign="baseline"
                  whiteSpace="nowrap"
                >
                  {part}
                </Box>
              ) : (
                part
              ),
            );
        }

        if (!isValidElement<DecoratableElementProps>(child)) {
          return [child];
        }

        if (
          child.props['data-testid'] === 'markdown-source-token' ||
          child.type === componentMap.code
        ) {
          return [child];
        }

        const nestedChildren = child.props.children;
        if (nestedChildren === undefined) {
          return [child];
        }

        return [cloneElement(child, undefined, decorateChildren(nestedChildren))];
      };

    const decorateChildren = (children: ReactNode): ReactNode =>
      Children.toArray(children).reduce<ReactNode[]>((accumulator, child) => {
        accumulator.push(...decorateNode(child));
        return accumulator;
      }, []);

    Object.assign(componentMap, {
      img: ({ src, alt }: MarkdownImageProps) => {
        const rawSrc = typeof src === 'string' ? src : undefined;
        const resolvedSrc = resolveImageSrc ? resolveImageSrc(rawSrc) : rawSrc ?? '';
        const altText = typeof alt === 'string' ? alt : '圖片';
        const imageNode = (
          <Box
            as="img"
            src={resolvedSrc}
            alt={altText}
            w="100%"
            maxH={variant === 'chat' ? '320px' : '420px'}
            objectFit="cover"
            display="block"
            loading="lazy"
          />
        );

        if (!onImageClick) {
          return (
            <Box
              my={variantStyles.blockSpacing}
              overflow="hidden"
              borderRadius="xl"
              border="1px solid"
              borderColor={imageBorderColor}
              bg={imageFrameBg}
            >
              {imageNode}
            </Box>
          );
        }

        return (
          <Box
            as="button"
            type="button"
            onClick={() => onImageClick(resolvedSrc, altText)}
            position="relative"
            display="block"
            w="full"
            maxW={variant === 'chat' ? '420px' : '100%'}
            my={variantStyles.blockSpacing}
            cursor="zoom-in"
            overflow="hidden"
            borderRadius="xl"
            border="1px solid"
            borderColor={imageBorderColor}
            bg={imageFrameBg}
            textAlign="left"
            transition="transform 0.2s ease, box-shadow 0.2s ease"
            _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
          >
            {imageNode}
            <Box
              position="absolute"
              right={3}
              bottom={3}
              display="inline-flex"
              alignItems="center"
              gap={1}
              px={2}
              py={1}
              borderRadius="full"
              bg="blackAlpha.700"
              color="white"
              fontSize="xs"
            >
              <FiSearch />
              <Text as="span" fontSize="xs" color="white">
                放大
              </Text>
            </Box>
          </Box>
        );
      },
      a: ({ href, children }: MarkdownAnchorProps) => (
        <Link
          href={href}
          color={linkColor}
          textDecoration="underline"
          _hover={{ opacity: 0.8 }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {decorateChildren(children)}
        </Link>
      ),
      code: ({ children, className }: MarkdownCodeProps) => {
        const isInline = !className;
        return isInline ? (
          <Code
            bg={codeBg}
            px={1.5}
            py={0.5}
            borderRadius="md"
            fontSize={variantStyles.codeFontSize}
            whiteSpace="break-spaces"
          >
            {children}
          </Code>
        ) : (
          <Box
            as="pre"
            bg={codeBg}
            p={4}
            borderRadius="lg"
            overflowX="auto"
            my={variantStyles.blockSpacing}
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            fontSize={variantStyles.codeFontSize}
          >
            <Code whiteSpace="inherit" fontSize="inherit" bg="transparent" p={0}>
              {children}
            </Code>
          </Box>
        );
      },
      p: ({ children }: MarkdownParagraphProps) => (
        <Text
          mb={variantStyles.paragraphMarginBottom}
          lineHeight="1.8"
          fontSize={variantStyles.containerFontSize}
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {decorateChildren(children)}
        </Text>
      ),
      h1: ({ children }: MarkdownHeadingProps) => (
        <Text as="h1" fontSize="2xl" fontWeight="bold" mt={variantStyles.blockSpacing + 1} mb={2}>
          {decorateChildren(children)}
        </Text>
      ),
      h2: ({ children }: MarkdownHeadingProps) => (
        <Text as="h2" fontSize="xl" fontWeight="bold" mt={variantStyles.blockSpacing} mb={2}>
          {decorateChildren(children)}
        </Text>
      ),
      h3: ({ children }: MarkdownHeadingProps) => (
        <Text as="h3" fontSize="lg" fontWeight="semibold" mt={variantStyles.blockSpacing} mb={2}>
          {decorateChildren(children)}
        </Text>
      ),
      ul: ({ children }: MarkdownListProps) => (
        <UnorderedList
          spacing={1}
          pl={5}
          my={variantStyles.listSpacing}
          styleType="disc"
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {children}
        </UnorderedList>
      ),
      ol: ({ children }: MarkdownListProps) => (
        <OrderedList
          spacing={1}
          pl={5}
          my={variantStyles.listSpacing}
          styleType="decimal"
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {children}
        </OrderedList>
      ),
      li: ({ children }: MarkdownListItemProps) => (
        <ListItem mb={1} fontSize={variantStyles.containerFontSize} sx={{ '& > p:last-of-type': { mb: 0 } }}>
          {decorateChildren(children)}
        </ListItem>
      ),
      blockquote: ({ children }: MarkdownBlockquoteProps) => (
        <Box
          as="blockquote"
          my={variantStyles.blockSpacing}
          px={4}
          py={3}
          borderLeft="4px solid"
          borderColor={blockquoteBorderColor}
          bg={blockquoteBg}
          borderRadius="md"
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {decorateChildren(children)}
        </Box>
      ),
      table: ({ children }: MarkdownTableProps) => (
        <Box overflowX="auto" my={variantStyles.blockSpacing}>
          <Box
            as="table"
            w="full"
            sx={{ borderCollapse: 'collapse', tableLayout: 'auto' }}
          >
            {children}
          </Box>
        </Box>
      ),
      th: ({ children }: MarkdownTableCellProps) => (
        <Box
          as="th"
          px={3}
          py={2}
          border="1px solid"
          borderColor={tableBorderColor}
          textAlign="left"
          fontWeight="semibold"
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {decorateChildren(children)}
        </Box>
      ),
      td: ({ children }: MarkdownTableCellProps) => (
        <Box
          as="td"
          px={3}
          py={2}
          border="1px solid"
          borderColor={tableBorderColor}
          verticalAlign="top"
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {decorateChildren(children)}
        </Box>
      ),
    });

    return componentMap;
  }, [
    blockquoteBg,
    blockquoteBorderColor,
    codeBg,
    imageBorderColor,
    imageFrameBg,
    linkColor,
    onImageClick,
    preserveSourceTokens,
    resolveImageSrc,
    sourceTokenBg,
    sourceTokenBorderColor,
    sourceTokenColor,
    tableBorderColor,
    variant,
    variantStyles,
  ]);

  return (
    <Box
      className={className}
      sx={{
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        '& > *': {
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        },
      }}
    >
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {normalizedContent}
      </ReactMarkdown>
    </Box>
  );
}

const MarkdownContent = memo(MarkdownContentComponent);

export default MarkdownContent;
