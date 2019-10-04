declare module '@octokit/graphql' {

    export type GraphQlQueryResponseData = {
        [key: string]: any;
    } | null;

    export type GraphQlQueryResponse = {
        data: GraphQlQueryResponseData;
        errors?: [
            {
                message: string;
                path: [string];
                extensions: { [key: string]: any };
                locations: [
                    {
                        line: number;
                        column: number;
                    }
                ];
            }
        ];
    };

    export type Variables = {}
}