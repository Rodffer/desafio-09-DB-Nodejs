import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const findCustomer = await this.customersRepository.findById(customer_id);

    if (!findCustomer) {
      throw new AppError('Customer not found');
    }

    const findAllProductsById = await this.productsRepository.findAllById(
      products,
    );

    if (findAllProductsById.length < 1) {
      throw new AppError('Product does not exists', 400);
    }
    const filteredProducts = findAllProductsById.map(product => {
      const { id } = product;

      const findProduct = products.find(p => p.id === id);

      if (!findProduct) {
        throw new AppError('Product does not exists', 400);
      }

      if (findProduct.quantity > product.quantity) {
        throw new AppError(
          'The specified quantity is greater than the available quantity',
        );
      }

      return {
        ...product,
        quantity: findProduct.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer: findCustomer,
      products: filteredProducts.map(product => ({
        product_id: product.id,
        quantity: product.quantity,
        price: product.price,
      })),
    });

    await this.productsRepository.updateQuantity(products);

    return order;

  }
}

export default CreateOrderService;
