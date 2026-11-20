import OrdersTable from '@/components/admin/OrdersTable';

export default function AdminOrdersPage() {
  return (
    <>
      <h1 className="mb-6 font-serif text-4xl text-cream-50">Заказы</h1>
      <OrdersTable />
    </>
  );
}