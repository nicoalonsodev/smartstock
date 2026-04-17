import { DataSource } from 'typeorm';

import { loadEnvFilesAndValidate } from '../config/bootstrap-env';
import { getDataSourceOptions } from './typeorm.config';

loadEnvFilesAndValidate();

export default new DataSource(getDataSourceOptions());
