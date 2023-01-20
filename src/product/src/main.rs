use core::panic;

use aws_config;
use aws_lambda_events::encodings::Body;
use aws_lambda_events::event::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_sdk_dynamodb as dynamodb;
use http::HeaderMap;
use lambda_runtime::{service_fn, Error, LambdaEvent};
use log::{info, LevelFilter};
use simple_logger::SimpleLogger;

#[tokio::main]
async fn main() -> Result<(), Error> {
    SimpleLogger::new()
        .with_level(LevelFilter::Info)
        .init()
        .unwrap();

    let service = service_fn(my_handler);
    lambda_runtime::run(service).await?;
    Ok(())
}

pub(crate) async fn my_handler(
    event: LambdaEvent<ApiGatewayProxyRequest>,
) -> Result<ApiGatewayProxyResponse, Error> {
    let config = aws_config::load_from_env().await;
    let dynamodb_client = dynamodb::Client::new(&config);

    info!("Starting");
    let path = event.payload.path.unwrap();
    info!("path: '{:?}'", path);

    let http_verb = event.payload.http_method;

    if (http_verb == "GET") {
        // Get products
        info!("Get products");
    } else if (http_verb == "POST") {
        // Create product
        info!("Create product");
    } else if (http_verb == "PUT") {
        // Update product
        info!("Update product");
    } else if (http_verb == "DELETE") {
        // Delete product
        info!("Delete product");
    } else {
        panic!("HTTP method not supported!")
    }

    let resp = ApiGatewayProxyResponse {
        status_code: 200,
        headers: HeaderMap::new(),
        multi_value_headers: HeaderMap::new(),
        body: Some(Body::Text(format!("{{\"msg\":\"Hello from '{}'\"}}", path))),
        is_base64_encoded: Some(false),
    };

    info!("response: '{:?}'", resp);

    let table_name = "products";

    let response = dynamodb_client
        .put_item()
        .table_name(table_name)
        .item("id", dynamodb::model::AttributeValue::S("123".to_owned()))
        .send()
        .await?;

    info!("result of dynamodb insert: {:?}", response);

    // Gets serialized to JSON automatically by runtime
    Ok(resp)
}
