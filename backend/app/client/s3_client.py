import boto3
import os
from app.config import settings
from botocore.exceptions import ClientError, NoCredentialsError
import logging


class S3Client:
    """
    A client class for interacting with an AWS S3 bucket,
    specifically for handling PDF files.
    """

    def __init__(self):
        self.bucket_name = settings.doc_bucket
        self.is_connected = False
        self.logger = logging.getLogger(__name__)

    def check_connection(self):
        """
        Verify that we can connect to AWS and that the specified bucket exists.
        Just throw if we can't
        """
        self.s3_client.head_bucket(Bucket=self.bucket_name)

    def connect(self):
        """
        Initialize the S3 client with credentials and bucket information and verify the connection.
        :raises: ConnectionError if connection cannot be established
        """
        try:
            self.s3_client = boto3.client(
                's3',
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key
            )
            self.is_connected = self.check_connection()
            self.logger.info(
                f"Successfully connected to S3 bucket: {self.bucket_name}")

        except NoCredentialsError:
            self.logger.error("No AWS credentials found")
            raise ConnectionError(
                "AWS credentials not found. Please provide valid credentials.")
        except ClientError as e:
            self.logger.error(f"Error connecting to S3: {e}")
            raise ConnectionError(f"Failed to connect to AWS: {str(e)}")
        except Exception as e:
            self.logger.error(f"Unexpected error during initialization: {e}")
            raise ConnectionError(
                f"Unexpected error during initialization: {str(e)}")

    def upload_pdf(self, file_path: str, object_name=None):
        """
        Upload a PDF file to the S3 bucket

        :param file_path: File path of the PDF to upload
        :param object_name: S3 object name. If not specified, file_name from file_path is used
        :return: True if file was uploaded, False otherwise
        """
        # If S3 object_name not specified, use file_name from file_path
        if object_name is None:
            object_name = os.path.basename(file_path)

        # Ensure we're only handling PDF files
        if not file_path.lower().endswith('.pdf'):
            self.logger.error(f"File {file_path} is not a PDF")
            return False

        try:
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                object_name,
                ExtraArgs={'ContentType': 'application/pdf'}
            )
            self.logger.info(
                f"Successfully uploaded {file_path} to {self.bucket_name}/{object_name}")
            return True
        except ClientError as e:
            self.logger.error(f"Error uploading file {file_path} to S3: {e}")
            return False

    def download_pdf(self, object_name, file_path=None):
        """
        Download a PDF file from the S3 bucket

        :param object_name: S3 object name to download
        :param file_path: Local path where the file should be saved. If not specified, 
                          it will be saved with the same name in the current directory
        :return: True if file was downloaded, False otherwise
        """
        # If file_path not specified, use object_name as the local file name
        if file_path is None:
            file_path = object_name

        try:
            self.s3_client.download_file(
                self.bucket_name, object_name, file_path)
            self.logger.info(
                f"Successfully downloaded {self.bucket_name}/{object_name} to {file_path}")
            return True
        except ClientError as e:
            self.logger.error(
                f"Error downloading file {object_name} from S3: {e}")
            return False

    def list_pdfs(self, prefix=''):
        """
        List all PDF files in the bucket with the given prefix

        :param prefix: Prefix to filter objects (e.g., 'documents/')
        :return: List of PDF object names
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            if 'Contents' not in response:
                return []

            # Filter for PDF files
            pdf_files = [
                obj['Key'] for obj in response['Contents']
                if obj['Key'].lower().endswith('.pdf')
            ]

            return pdf_files
        except ClientError as e:
            self.logger.error(f"Error listing PDF files in S3: {e}")
            return []

    def delete_pdf(self, object_name):
        """
        Delete a PDF file from the S3 bucket

        :param object_name: S3 object name to delete
        :return: True if file was deleted, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_name
            )
            self.logger.info(
                f"Successfully deleted {object_name} from {self.bucket_name}")
            return True
        except ClientError as e:
            self.logger.error(
                f"Error deleting file {object_name} from S3: {e}")
            return False

    def get_presigned_url(self, object_name, expiration=3600):
        """
        Generate a presigned URL for downloading a PDF file

        :param object_name: S3 object name
        :param expiration: Time in seconds for the URL to remain valid (default: 1 hour)
        :return: Presigned URL as string, or None if error
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_name
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            self.logger.error(
                f"Error generating presigned URL for {object_name}: {e}")
            return None


s3_client = S3Client()


def get_s3_client() -> S3Client:
    if not s3_client.is_connected:
        s3_client.connect()
    return s3_client
