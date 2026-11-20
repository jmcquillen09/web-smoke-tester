const DOCS_PAGE = /swagger-?ui|redoc/i

// Whether a text looks like a Swagger UI or Redoc page, or the script that sets one up: it names one.
export const isApiDocsPage = (text: string): boolean => DOCS_PAGE.test(text)
