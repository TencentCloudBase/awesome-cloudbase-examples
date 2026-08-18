import * as React from "react";

import { $w as base$W, createPageApi } from "@/lib/weda-client";
import { _WEDA_CLOUD_SDK as WEDA_CLOUD_SDK } from "@cloudbase/weda-client";
import querystring from "query-string";
const { createDataset, EXTRA_API } = WEDA_CLOUD_SDK;

export function PageWrapper({
  id,
  Page,
  ...props
}: {
  id: string;
  Page: React.FunctionComponent<{ $w: typeof base$W }>;
}) {
  const $page = React.useMemo(() => {
    const $page = createPageApi();
    const dataset = createDataset(id, undefined, { appId: "weda" });
    Object.assign($page, {
      __internal__: {
        ...$page.__internal__,
        packageName: "",
        $w: new Proxy(base$W, {
          get(obj, prop: string) {
            /**
             * 使用当前的实例进行覆盖
             */
            if (prop === "$page" || prop === "page") {
              return $page;
            }

            return obj[prop];
          },
        }),
      },
      id,
      uuid: id,
      dataset,
    });

    return $page;
  }, []);

  const pageCodeContextRef = React.useRef($page);
  pageCodeContextRef.current = $page;

  React.useEffect(() => {
    const query =
      querystring.parse((location.search || "").split("?")[1] || "") || {};

    EXTRA_API.setParams(id, query || {}, { force: true });
    base$W.app.__internal__.activePage = pageCodeContextRef.current;
    return () => {
      if (pageCodeContextRef.current.__internal__) {
        pageCodeContextRef.current.__internal__.active = false;
      }
    };
  }, []);

  return <Page {...props} $w={$page.__internal__.$w || base$W} />;
}
