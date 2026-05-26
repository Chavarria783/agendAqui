/**
 * Tests unitarios para componentes compartidos (shared)
 * Módulos: Sprint 1-3 (componentes reutilizados en toda la app)
 */
import { render, screen, fireEvent } from '../../../test-utils';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import Modal from '../Modal';
import ConfirmModal from '../ConfirmModal';
import Loading from '../Loading';
import Badge from '../Badge';

// =====================================================================
// Button
// =====================================================================
describe('Button', () => {
  it('debe renderizar con texto', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('debe aplicar variante primary por defecto', () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('button--primary');
  });

  it('debe aplicar variante danger', () => {
    render(<Button variant="danger">Eliminar</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('button--danger');
  });

  it('debe mostrar spinner cuando loading=true', () => {
    render(<Button loading>Guardando</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('button--loading');
    expect(btn).toBeDisabled();
  });

  it('debe estar deshabilitado cuando disabled=true', () => {
    render(<Button disabled>No click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('debe ejecutar onClick al hacer click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('debe aplicar fullWidth', () => {
    render(<Button fullWidth>Ancho completo</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('button--full-width');
  });
});

// =====================================================================
// Input
// =====================================================================
describe('Input', () => {
  it('debe renderizar con label', () => {
    render(<Input label="Nombre" name="nombre" />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });

  it('debe mostrar asterisco si es required', () => {
    render(<Input label="Email" name="email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('debe mostrar mensaje de error', () => {
    render(<Input label="Nombre" name="nombre" error="Campo obligatorio" />);
    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument();
  });

  it('debe manejar onChange', () => {
    const handleChange = vi.fn();
    render(<Input label="Nombre" name="nombre" value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Juan' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('debe estar deshabilitado cuando disabled=true', () => {
    render(<Input label="Test" name="test" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});

// =====================================================================
// Select
// =====================================================================
describe('Select', () => {
  const opciones = [
    { value: '1', label: 'Opción 1' },
    { value: '2', label: 'Opción 2' },
    { value: '3', label: 'Opción 3' },
  ];

  it('debe renderizar opciones correctamente', () => {
    render(<Select label="Tipo" name="tipo" options={opciones} value="" onChange={() => {}} />);
    expect(screen.getByText('Opción 1')).toBeInTheDocument();
    expect(screen.getByText('Opción 2')).toBeInTheDocument();
    expect(screen.getByText('Opción 3')).toBeInTheDocument();
  });

  it('debe mostrar placeholder por defecto', () => {
    render(<Select name="tipo" options={opciones} value="" onChange={() => {}} />);
    expect(screen.getByText('Seleccionar...')).toBeInTheDocument();
  });

  it('debe manejar cambio de valor', () => {
    const handleChange = vi.fn();
    render(<Select name="tipo" options={opciones} value="" onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('debe mostrar error', () => {
    render(<Select name="tipo" options={opciones} value="" onChange={() => {}} error="Seleccione una opción" />);
    expect(screen.getByText('Seleccione una opción')).toBeInTheDocument();
  });
});

// =====================================================================
// Modal
// =====================================================================
describe('Modal', () => {
  it('no debe renderizar si isOpen=false', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test">Contenido</Modal>);
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('debe renderizar contenido si isOpen=true', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Mi Modal">Contenido del modal</Modal>);
    expect(screen.getByText('Contenido del modal')).toBeInTheDocument();
  });

  it('debe mostrar título', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Título de Prueba">Body</Modal>);
    expect(screen.getByText('Título de Prueba')).toBeInTheDocument();
  });

  it('debe ejecutar onClose al cerrar', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Body</Modal>);
    const closeButton = document.querySelector('.modal__close');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('debe renderizar footer si se proporciona', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test" footer={<button>Aceptar</button>}>
        Body
      </Modal>
    );
    expect(screen.getByText('Aceptar')).toBeInTheDocument();
  });
});

// =====================================================================
// ConfirmModal
// =====================================================================
describe('ConfirmModal', () => {
  it('debe mostrar mensaje de confirmación', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        message="¿Desea eliminar este registro?"
      />
    );
    expect(screen.getByText('¿Desea eliminar este registro?')).toBeInTheDocument();
  });

  it('debe ejecutar onConfirm al confirmar', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={handleConfirm}
        message="¿Confirmar?"
        confirmText="Sí, confirmar"
      />
    );
    fireEvent.click(screen.getByText('Sí, confirmar'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('debe ejecutar onClose al cancelar', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={() => {}}
        message="¿Cancelar?"
        cancelText="No, cancelar"
      />
    );
    fireEvent.click(screen.getByText('No, cancelar'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('debe mostrar título personalizado', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Eliminar habitación"
        message="Esta acción no se puede deshacer"
      />
    );
    expect(screen.getByText('Eliminar habitación')).toBeInTheDocument();
  });
});

// =====================================================================
// Loading
// =====================================================================
describe('Loading', () => {
  it('debe renderizar texto de carga por defecto', () => {
    render(<Loading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('debe renderizar texto personalizado', () => {
    render(<Loading text="Procesando datos..." />);
    expect(screen.getByText('Procesando datos...')).toBeInTheDocument();
  });

  it('debe aplicar clase fullscreen', () => {
    const { container } = render(<Loading fullScreen />);
    expect(container.querySelector('.loading--fullscreen')).toBeInTheDocument();
  });

  it('debe no mostrar texto si text es vacío', () => {
    const { container } = render(<Loading text="" />);
    expect(container.querySelector('.loading__text')).not.toBeInTheDocument();
  });
});

// =====================================================================
// Badge
// =====================================================================
describe('Badge', () => {
  it('debe renderizar con contenido', () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('debe aplicar variante default por defecto', () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.querySelector('.badge--default')).toBeInTheDocument();
  });

  it('debe aplicar variante personalizada', () => {
    const { container } = render(<Badge variant="success">Disponible</Badge>);
    expect(container.querySelector('.badge--success')).toBeInTheDocument();
  });

  it('debe aplicar tamaño personalizado', () => {
    const { container } = render(<Badge size="small">Mini</Badge>);
    expect(container.querySelector('.badge--small')).toBeInTheDocument();
  });
});
