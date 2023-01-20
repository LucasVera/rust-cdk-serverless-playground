import * as cdk from 'aws-cdk-lib'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'

export class CdkUdemyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const productTable = new Table(this, 'productTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      tableName: 'products',
      readCapacity: 2,
      writeCapacity: 2,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const lambdaTarget = 'x86_64-unknown-linux-musl'

    console.log('current dir', __dirname)

    const productFunction = new cdk.aws_lambda.Function(this, 'product', {
      code: cdk.aws_lambda.Code.fromAsset('src/product', {
        bundling: {
          command: [
            'bash', '-c',
            // 'sudo apt install musl-tools',
            `rustup target add ${lambdaTarget} && cargo build --release --target ${lambdaTarget} && cp target/${lambdaTarget}/release/product /asset-output/bootstrap`
          ],
          /**
           * Custom dockerfile is needed to install musl-tools for aws packages that need it
           */
          image: cdk.DockerImage.fromBuild(`${__dirname}/lambda`),
          // image: cdk.DockerImage.fromRegistry('rust:1.66-slim'),
          // image: cdk.DockerImage.fromRegistry('rust:1.66'),
          // image: cdk.DockerImage.fromRegistry('rust:1.66.1-alpine3.16'),
        },
      }),
      functionName: 'product',
      handler: 'main',
      runtime: cdk.aws_lambda.Runtime.PROVIDED_AL2,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      memorySize: 512,
    })

    productTable.grantReadWriteData(productFunction)


    /**
     * products
     * GET /product         --> list products
     * POST /product        --> creates one product
     * GET /product/{id}    --> get one product
     * PUT /product/{id}    --> update one product
     * DELETE /product/{id} --> delete one product
     */
    const productApiGateway = new cdk.aws_apigateway.LambdaRestApi(this, 'productApi', {
      restApiName: 'ProductService',
      handler: productFunction,
      proxy: false,
    })

    const productResource = productApiGateway.root.addResource('product') // /product
    productResource.addMethod('GET')
    productResource.addMethod('POST')

    const productIdResource = productApiGateway.root.addResource('{id}') // /product/{id}
    productIdResource.addMethod('GET')
    productIdResource.addMethod('PUT')
    productIdResource.addMethod('DELETE')

  }
}
